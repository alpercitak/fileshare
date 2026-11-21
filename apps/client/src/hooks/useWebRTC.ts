import type {
  ClientMessage,
  DataChannelFileHeader,
  DataChannelMessage,
  RoomCode,
  ServerMessage,
} from '@fileshare/shared';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { BUFFERED_AMOUNT_HIGH, BUFFERED_AMOUNT_LOW, CHUNK_SIZE, STUN } from '@/constants';
import type { ConnectionStatus, InboundTransfer, OutboundTransfer, WebRTCState } from '@/types';
import { assembleFile, decodeFrame, encodeFrame } from '@/utils/binary';
import { decryptChunk, deriveSharedKey, encryptChunk, generateKeyPair } from '@/utils/crypto';

export const useWebRTC = (socketHost: string): WebRTCState => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [roomCode, setRoomCode] = useState<RoomCode | null>(null);
  const [dataChannelOpen, setDataChannelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inbound, setInbound] = useState<Record<string, InboundTransfer>>({});
  const [outbound, setOutbound] = useState<Record<string, OutboundTransfer>>({});

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const sharedKeyRef = useRef<Promise<CryptoKey> | null>(null);
  const activeHeaderRef = useRef<DataChannelFileHeader | null>(null);
  const inboundChunksRef = useRef<Record<string, { chunks: Array<ArrayBuffer>; received: number }>>({});
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());

  const sigSend = useCallback((message: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(message));
  }, []);

  const setupDataChannel = useCallback((dataChannel: RTCDataChannel) => {
    dataChannelRef.current = dataChannel;
    dataChannel.binaryType = 'arraybuffer';
    dataChannel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW;
    const keyPair = generateKeyPair();
    let resolvePeerKey: (jwk: JsonWebKey) => void;
    const peerKey = new Promise<JsonWebKey>((resolve) => {
      resolvePeerKey = resolve;
    });
    sharedKeyRef.current = Promise.all([keyPair, peerKey]).then(([{ privateKey }, jwk]) =>
      deriveSharedKey(privateKey, jwk),
    );

    dataChannel.onopen = async () => {
      setDataChannelOpen(true);
      const { publicKey } = await keyPair;
      const pubJwk = await crypto.subtle.exportKey('jwk', publicKey);
      dataChannel.send(JSON.stringify({ type: 'handshake', publicKey: pubJwk }));
    };

    dataChannel.onclose = () => setDataChannelOpen(false);

    dataChannel.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        const { index, data } = decodeFrame(event.data);
        const header = activeHeaderRef.current;
        if (!header) {
          return;
        }
        const key = await sharedKeyRef.current;
        if (!key) {
          return;
        }
        const decrypted = await decryptChunk(key, data);

        const entry = inboundChunksRef.current[header.transferId];
        entry.chunks[index] = decrypted;
        entry.received++;
        const progressStep = Math.ceil(header.totalChunks / 100);
        if (entry.received === header.totalChunks) {
          const url = URL.createObjectURL(assembleFile(header, entry.chunks));
          delete inboundChunksRef.current[header.transferId];
          setInbound((prev) => ({
            ...prev,
            [header.transferId]: { ...prev[header.transferId], receivedChunks: entry.received, done: true, url },
          }));
        } else if (entry.received % progressStep === 0) {
          setInbound((prev) => ({
            ...prev,
            [header.transferId]: { ...prev[header.transferId], receivedChunks: entry.received },
          }));
        }
        return;
      }

      const msg = JSON.parse(event.data) as DataChannelMessage;
      switch (msg.type) {
        case 'handshake':
          resolvePeerKey(msg.publicKey);
          break;
        case 'fileHeader':
          activeHeaderRef.current = msg;
          inboundChunksRef.current[msg.transferId] = { chunks: new Array(msg.totalChunks), received: 0 };
          setInbound((prev) => ({
            ...prev,
            [msg.transferId]: {
              transferId: msg.transferId,
              header: msg,
              receivedChunks: 0,
              done: false,
              url: null,
            },
          }));
          break;
      }
    };
  }, []);

  const createPeerConnection = useCallback(
    (roomCode: RoomCode) => {
      const peerConnection = new RTCPeerConnection(STUN);
      peerConnectionRef.current = peerConnection;
      peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          sigSend({ type: 'iceCandidate', payload: { roomCode, candidate: candidate.toJSON() } });
        }
      };
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'failed') setStatus('failed');
        if (peerConnection.connectionState === 'connected') setStatus('connected');
      };
      return peerConnection;
    },
    [sigSend],
  );

  const handleSignaling = useCallback(
    async (msg: ServerMessage) => {
      setError(null);
      switch (msg.type) {
        case 'roomCreated':
          setRoomCode(msg.payload.roomCode);
          setStatus('connecting');
          break;
        case 'roomJoined':
          setRoomCode(msg.payload.roomCode);
          setStatus('connecting');
          createPeerConnection(msg.payload.roomCode);
          break;
        case 'peerJoined': {
          const peerConnection = createPeerConnection(msg.payload.roomCode);
          setupDataChannel(peerConnection.createDataChannel('fileshare'));
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          sigSend({ type: 'sdpOffer', payload: { roomCode: msg.payload.roomCode, sdp: offer } });
          break;
        }
        case 'sdpOffer': {
          const peerConnection = createPeerConnection(msg.payload.roomCode);
          await peerConnection.setRemoteDescription(msg.payload.sdp);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          sigSend({ type: 'sdpAnswer', payload: { roomCode: msg.payload.roomCode, sdp: answer } });
          peerConnection.ondatachannel = ({ channel }) => setupDataChannel(channel);
          break;
        }
        case 'sdpAnswer':
          await peerConnectionRef.current?.setRemoteDescription(msg.payload.sdp);
          break;
        case 'iceCandidate':
          await peerConnectionRef.current?.addIceCandidate(msg.payload.candidate);
          break;
        case 'error':
          setError(msg.payload.message);
          break;
      }
    },
    [createPeerConnection, setupDataChannel, sigSend],
  );

  useEffect(() => {
    const ws = new WebSocket(`ws://${socketHost}`);
    socketRef.current = ws;
    ws.onmessage = (e) => handleSignaling(JSON.parse(e.data));
    return () => ws.close();
  }, [handleSignaling, socketHost]);

  const sendFile = useCallback((file: File) => {
    const next = sendQueueRef.current.then(async () => {
      const key = await sharedKeyRef.current;
      const dataChannel = dataChannelRef.current;
      if (!key || dataChannel?.readyState !== 'open') {
        return;
      }

      const transferId = crypto.randomUUID();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const progressStep = Math.ceil(totalChunks / 100);

      dataChannel.send(
        JSON.stringify({
          type: 'fileHeader',
          transferId,
          name: file.name,
          totalChunks,
          size: file.size,
          mimeType: file.type,
          chunkSize: CHUNK_SIZE,
        }),
      );

      setOutbound((prev) => ({
        ...prev,
        [transferId]: { transferId, name: file.name, totalChunks, sentChunks: 0, done: false },
      }));

      for (let i = 0; i < totalChunks; i++) {
        if (dataChannel.bufferedAmount > BUFFERED_AMOUNT_HIGH) {
          await new Promise((resolve) => dataChannel.addEventListener('bufferedamountlow', resolve, { once: true }));
        }
        const slice = await file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).arrayBuffer();
        const encrypted = await encryptChunk(key, slice);
        dataChannel.send(encodeFrame(i, encrypted));
        if ((i + 1) % progressStep === 0) {
          setOutbound((prev) => ({ ...prev, [transferId]: { ...prev[transferId], sentChunks: i + 1 } }));
        }
      }
      setOutbound((prev) => ({
        ...prev,
        [transferId]: { ...prev[transferId], sentChunks: totalChunks, done: true },
      }));
    });
    sendQueueRef.current = next.catch(() => {}); // keep the queue alive; the error still reaches the caller via `next`
    return next;
  }, []);

  return {
    status,
    roomCode,
    dataChannelOpen,
    inbound,
    outbound,
    error,
    actions: {
      createRoom: () => sigSend({ type: 'createRoom' }),
      joinRoom: (c) => sigSend({ type: 'joinRoom', payload: { roomCode: c } }),
      sendFile,
    },
  };
};

import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type {
  ClientMessage,
  ServerMessage,
  DataChannelMessage,
  DataChannelFileHeader,
  RoomCode,
} from '@fileshare/shared';
import { getPort } from '@fileshare/shared';
import { STUN, CHUNK_SIZE, BUFFERED_AMOUNT_HIGH } from '@/constants';
import type { WebRTCState, ConnectionStatus, InboundTransfer, OutboundTransfer } from '@/types';
import { decodeFrame, encodeFrame, assembleFile } from '@/utils/binary';
import { generateKeyPair, deriveSharedKey, encryptChunk, decryptChunk } from '@/utils/crypto';

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
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  const activeHeaderRef = useRef<DataChannelFileHeader | null>(null);

  const sigSend = useCallback((message: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(message));
  }, []);

  const setupDataChannel = useCallback((dataChannel: RTCDataChannel) => {
    dataChannelRef.current = dataChannel;
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = async () => {
      setDataChannelOpen(true);
      const keyPair = await generateKeyPair();
      keyPairRef.current = keyPair;
      const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      dataChannel.send(JSON.stringify({ type: 'handshake', publicKey: pubJwk }));
    };

    dataChannel.onclose = () => setDataChannelOpen(false);

    dataChannel.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        const { index, data } = decodeFrame(event.data);
        const header = activeHeaderRef.current;
        if (!header || !sharedKeyRef.current) {
          return;
        }

        const decrypted = await decryptChunk(sharedKeyRef.current, data);

        setInbound((prev) => {
          const current = prev[header.transferId];
          if (!current) {
            return prev;
          }
          const newChunks = [...current.chunks];
          newChunks[index] = decrypted;
          const received = newChunks.filter(Boolean).length;
          const done = received === header.totalChunks;
          return {
            ...prev,
            [header.transferId]: {
              ...current,
              chunks: newChunks,
              done,
              url: done ? URL.createObjectURL(assembleFile(header, newChunks)) : null,
            },
          };
        });
        return;
      }

      const msg = JSON.parse(event.data) as DataChannelMessage;
      switch (msg.type) {
        case 'handshake':
          if (keyPairRef.current) {
            sharedKeyRef.current = await deriveSharedKey(keyPairRef.current.privateKey, msg.publicKey);
          }
          break;
        case 'fileHeader':
          activeHeaderRef.current = msg;
          setInbound((prev) => ({
            ...prev,
            [msg.transferId]: {
              transferId: msg.transferId,
              header: msg,
              chunks: new Array(msg.totalChunks),
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

  const sendFile = useCallback(async (file: File) => {
    const dataChannel = dataChannelRef.current;
    const key = sharedKeyRef.current;
    if (!dataChannel || !key || dataChannel.readyState !== 'open') {
      return;
    }

    const transferId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

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
      while (dataChannel.bufferedAmount > BUFFERED_AMOUNT_HIGH) {
        await new Promise((r) => setTimeout(r, 20));
      }
      const slice = await file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).arrayBuffer();
      const encrypted = await encryptChunk(key, slice);
      dataChannel.send(encodeFrame(i, encrypted));
      setOutbound((prev) => ({ ...prev, [transferId]: { ...prev[transferId], sentChunks: i + 1 } }));
    }
    setOutbound((prev) => ({ ...prev, [transferId]: { ...prev[transferId], done: true } }));
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

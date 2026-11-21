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
import {
  decryptChunk,
  deriveSharedKey,
  encryptChunk,
  generateKeyPair,
  getVerificationCode,
  hashJwk,
} from '@/utils/crypto';
import { discardFileSink, type FileSink, openFileSink } from '@/utils/save';

const chunkAad = (transferId: string, index: number) => new TextEncoder().encode(`${transferId}:${index}`);

interface InboundEntry {
  chunks: Array<ArrayBuffer>; // in-memory path only
  received: number;
  sink: Promise<FileSink | null>; // null: in-memory path
}

export const useWebRTC = (socketUrl: string): WebRTCState => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [roomCode, setRoomCode] = useState<RoomCode | null>(null);
  const [dataChannelOpen, setDataChannelOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveFolder, setSaveFolder] = useState<string | null>(null);

  const [inbound, setInbound] = useState<Record<string, InboundTransfer>>({});
  const [outbound, setOutbound] = useState<Record<string, OutboundTransfer>>({});

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const sharedKeyRef = useRef<Promise<CryptoKey> | null>(null);
  const activeHeaderRef = useRef<DataChannelFileHeader | null>(null);
  const saveFolderRef = useRef<FileSystemDirectoryHandle | null>(null);
  const inboundChunksRef = useRef<Record<string, InboundEntry>>({});
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve());

  const sigSend = useCallback((message: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(message));
  }, []);

  const resetConnection = useCallback((message: string) => {
    const dataChannel = dataChannelRef.current;
    const peerConnection = peerConnectionRef.current;
    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    sharedKeyRef.current = null;
    activeHeaderRef.current = null;
    for (const entry of Object.values(inboundChunksRef.current)) {
      entry.sink.then((sink) => sink && discardFileSink(sink)); // remove partially written files
    }
    inboundChunksRef.current = {};
    sendQueueRef.current = Promise.resolve();
    dataChannel?.close();
    peerConnection?.close();
    setDataChannelOpen(false);
    setStatus('idle');
    setRoomCode(null);
    setVerificationCode(null);
    setError(message);
  }, []);

  const setupDataChannel = useCallback(
    (dataChannel: RTCDataChannel) => {
      dataChannelRef.current = dataChannel;
      dataChannel.binaryType = 'arraybuffer';
      dataChannel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW;
      const keyPair = generateKeyPair();
      const ownJwk = keyPair.then(({ publicKey }) => crypto.subtle.exportKey('jwk', publicKey));
      let resolvePeerKey: (jwk: JsonWebKey) => void;
      const peerKey = new Promise<JsonWebKey>((resolve) => {
        resolvePeerKey = resolve;
      });
      let resolveCommitSent: () => void;
      const commitSent = new Promise<void>((resolve) => {
        resolveCommitSent = resolve;
      });
      let peerCommit: string | null = null;
      let peerRevealed = false;
      sharedKeyRef.current = Promise.all([keyPair, peerKey]).then(([{ privateKey }, jwk]) =>
        deriveSharedKey(privateKey, jwk),
      );
      Promise.all([ownJwk, peerKey])
        .then(([own, peer]) => getVerificationCode(own, peer))
        .then(setVerificationCode);

      dataChannel.onopen = async () => {
        setDataChannelOpen(true);
        dataChannel.send(JSON.stringify({ type: 'commit', hash: await hashJwk(await ownJwk) }));
        resolveCommitSent();
      };

      dataChannel.onclose = () => {
        if (dataChannelRef.current !== dataChannel) {
          return;
        }
        sigSend({ type: 'leaveRoom' });
        resetConnection('Connection closed');
      };

      dataChannel.onmessage = async (event) => {
        if (event.data instanceof ArrayBuffer) {
          const { index, data } = decodeFrame(event.data);
          const header = activeHeaderRef.current;
          if (!header || index >= header.totalChunks) {
            return;
          }
          const key = await sharedKeyRef.current;
          if (!key) {
            return;
          }
          const decrypted = await decryptChunk(key, data, chunkAad(header.transferId, index));

          const entry = inboundChunksRef.current[header.transferId];
          if (!entry) {
            return; // connection was reset while this chunk was decrypting
          }
          const sink = await entry.sink;
          if (inboundChunksRef.current[header.transferId] !== entry) {
            return; // connection was reset while the file was opening
          }
          if (sink) {
            await sink.writer.write({ type: 'write', position: index * header.chunkSize, data: decrypted });
          } else {
            entry.chunks[index] = decrypted;
          }
          entry.received++;
          const progressStep = Math.ceil(header.totalChunks / 100);
          if (entry.received === header.totalChunks) {
            delete inboundChunksRef.current[header.transferId];
            if (sink) {
              await sink.writer.close();
              setInbound((prev) => ({
                ...prev,
                [header.transferId]: {
                  ...prev[header.transferId],
                  receivedChunks: entry.received,
                  done: true,
                  savedTo: `${sink.dir.name}/${sink.name}`,
                },
              }));
            } else {
              const url = URL.createObjectURL(assembleFile(header, entry.chunks));
              setInbound((prev) => ({
                ...prev,
                [header.transferId]: {
                  ...prev[header.transferId],
                  receivedChunks: entry.received,
                  done: true,
                  url,
                },
              }));
            }
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
          case 'commit':
            // accept one commit per channel, and reveal only after our own commit is on the wire
            if (peerCommit !== null) {
              break;
            }
            peerCommit = msg.hash;
            await commitSent;
            dataChannel.send(JSON.stringify({ type: 'handshake', publicKey: await ownJwk }));
            break;
          case 'handshake':
            if (peerRevealed) {
              break;
            }
            peerRevealed = true;
            if (peerCommit === null || (await hashJwk(msg.publicKey)) !== peerCommit) {
              if (dataChannelRef.current === dataChannel) {
                sigSend({ type: 'leaveRoom' });
                resetConnection('Key verification failed');
              }
              break;
            }
            resolvePeerKey(msg.publicKey);
            break;
          case 'fileHeader':
            // trust boundary: chunk positions derive from these, so they must match what our sender produces
            if (
              msg.chunkSize !== CHUNK_SIZE ||
              !Number.isSafeInteger(msg.totalChunks) ||
              msg.totalChunks !== Math.ceil(msg.size / CHUNK_SIZE)
            ) {
              activeHeaderRef.current = null;
              break;
            }
            if (msg.totalChunks === 0) {
              setInbound((prev) => ({
                ...prev,
                [msg.transferId]: {
                  transferId: msg.transferId,
                  header: msg,
                  receivedChunks: 0,
                  done: true,
                  url: URL.createObjectURL(assembleFile(msg, [])),
                  savedTo: null,
                },
              }));
              break;
            }
            activeHeaderRef.current = msg;
            inboundChunksRef.current[msg.transferId] = {
              chunks: [],
              received: 0,
              sink: saveFolderRef.current ? openFileSink(saveFolderRef.current, msg.name) : Promise.resolve(null),
            };
            setInbound((prev) => ({
              ...prev,
              [msg.transferId]: {
                transferId: msg.transferId,
                header: msg,
                receivedChunks: 0,
                done: false,
                url: null,
                savedTo: null,
              },
            }));
            break;
        }
      };
    },
    [sigSend, resetConnection],
  );

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
        if (peerConnection.connectionState === 'failed' && peerConnectionRef.current === peerConnection) {
          sigSend({ type: 'leaveRoom' });
          resetConnection('Connection failed');
        }
        if (peerConnection.connectionState === 'connected') setStatus('connected');
      };
      return peerConnection;
    },
    [sigSend, resetConnection],
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
        case 'peerLeft':
          resetConnection('Peer left the room');
          break;
        case 'error':
          if (msg.payload.code === 'ROOM_EXPIRED') {
            resetConnection(msg.payload.message);
          } else {
            setError(msg.payload.message);
          }
          break;
      }
    },
    [createPeerConnection, resetConnection, setupDataChannel, sigSend],
  );

  useEffect(() => {
    const ws = new WebSocket(socketUrl);
    socketRef.current = ws;
    ws.onmessage = (e) => handleSignaling(JSON.parse(e.data));
    return () => ws.close();
  }, [handleSignaling, socketUrl]);

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
          await new Promise<void>((resolve) => {
            const done = () => {
              dataChannel.removeEventListener('bufferedamountlow', done);
              dataChannel.removeEventListener('close', done);
              resolve();
            };
            dataChannel.addEventListener('bufferedamountlow', done);
            dataChannel.addEventListener('close', done);
          });
        }
        const slice = await file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).arrayBuffer();
        const encrypted = await encryptChunk(key, slice, chunkAad(transferId, i));
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

  const chooseSaveFolder = useCallback(async () => {
    try {
      const dir = await window.showDirectoryPicker?.({ mode: 'readwrite' });
      if (!dir) {
        return;
      }
      saveFolderRef.current = dir;
      setSaveFolder(dir.name);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    }
  }, []);

  return {
    status,
    roomCode,
    dataChannelOpen,
    inbound,
    outbound,
    verificationCode,
    error,
    saveFolder,
    actions: {
      createRoom: () => sigSend({ type: 'createRoom' }),
      joinRoom: (c) => sigSend({ type: 'joinRoom', payload: { roomCode: c } }),
      sendFile,
      chooseSaveFolder: window.showDirectoryPicker ? chooseSaveFolder : undefined,
    },
  };
};

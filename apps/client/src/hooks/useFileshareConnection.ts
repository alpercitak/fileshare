import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'preact/hooks';
import type { ChunkEvent, ClientMessage, MetadataEvent, ServerMessage } from '@fileshare/shared';
import { receiveChunkAtom, receiveMetadataAtom, setPeersAtom, setSocketAtom, socketAtom } from '@/store';

const SOCKET_HOST = 'localhost:4001';

export const useFileshareConnection = () => {
  const socket = useAtomValue(socketAtom);
  const setSocket = useSetAtom(setSocketAtom);
  const setPeers = useSetAtom(setPeersAtom);
  const receiveMetadata = useSetAtom(receiveMetadataAtom);
  const receiveChunk = useSetAtom(receiveChunkAtom);

  useEffect(() => {
    const nextSocket = new WebSocket(`ws://${SOCKET_HOST}`);

    setSocket(nextSocket);

    nextSocket.addEventListener('open', () => {
      const message: ClientMessage = { type: 'getPeers' };

      nextSocket.send(JSON.stringify(message));
    });

    nextSocket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as ServerMessage;

      switch (message.type) {
        case 'peers':
          setPeers(message.payload);
          break;
        case 'metadata':
          receiveMetadata(message.payload as MetadataEvent);
          break;
        case 'chunk':
          receiveChunk(message.payload as ChunkEvent);
          break;
      }
    });

    return () => {
      nextSocket.close();
      setSocket(null);
    };
  }, [receiveChunk, receiveMetadata, setPeers, setSocket]);

  return socket;
};

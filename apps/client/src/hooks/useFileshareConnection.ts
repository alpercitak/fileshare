import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'preact/hooks';
import { io } from 'socket.io-client';
import { receiveChunkAtom, receiveMetadataAtom, setPeersAtom, setSocketAtom, socketAtom } from '../store';
import type { ChunkEvent, MetadataEvent, PeerId } from '../types';

const SOCKET_HOST = 'localhost:4001';

export const useFileshareConnection = () => {
  const socket = useAtomValue(socketAtom);
  const setSocket = useSetAtom(setSocketAtom);
  const setPeers = useSetAtom(setPeersAtom);
  const receiveMetadata = useSetAtom(receiveMetadataAtom);
  const receiveChunk = useSetAtom(receiveChunkAtom);

  useEffect(() => {
    const nextSocket = io(`ws://${SOCKET_HOST}`, {
      forceNew: true,
      query: {},
    });

    setSocket(nextSocket);

    nextSocket.on('connect', () => {
      nextSocket.emit('getPeers');
    });

    nextSocket.on('getPeers', (ids: Array<PeerId>) => {
      setPeers(ids);
    });

    nextSocket.on('metadata', (data: MetadataEvent) => {
      receiveMetadata(data);
    });

    nextSocket.on('chunk', (data: ChunkEvent) => {
      receiveChunk(data);
    });

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [receiveChunk, receiveMetadata, setPeers, setSocket]);

  return socket;
};

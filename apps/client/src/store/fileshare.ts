import { atom } from 'jotai';
import type { Socket } from 'socket.io-client';

import type { ChunkEvent, FileTransfer, Metadata, MetadataEvent, PeerId } from '../types';
import { CHUNK_SIZE, chunkSubstr, decodeMetadata, readFileAsDataUrl } from '../utils';

export const peersAtom = atom<Array<PeerId>>([]);
export const filesAtom = atom<Record<string, FileTransfer>>({});
export const socketAtom = atom<Socket | null>(null);

export const setSocketAtom = atom(null, (_get, set, socket: Socket | null) => {
  set(socketAtom, socket);
});

export const setPeersAtom = atom(null, (_get, set, peers: PeerId[]) => {
  set(peersAtom, peers);
});

export const receiveMetadataAtom = atom(null, (get, set, data: MetadataEvent) => {
  const metadata = decodeMetadata(data.id);
  const currentFiles = get(filesAtom);

  set(filesAtom, {
    ...currentFiles,
    [data.id]: currentFiles[data.id] ?? {
      chunks: [],
      id: data.id,
      indexTotal: data.indexTotal,
      metadata,
    },
  });
});

export const receiveChunkAtom = atom(null, (get, set, data: ChunkEvent) => {
  const currentFiles = get(filesAtom);
  const currentFile = currentFiles[data.id];

  if (!currentFile) {
    return;
  }

  set(filesAtom, {
    ...currentFiles,
    [data.id]: {
      ...currentFile,
      chunks: [...currentFile.chunks, data],
    },
  });
});

export const sendFileAtom = atom(null, async (get, _set, file: File) => {
  const socket = get(socketAtom);

  if (!socket) {
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const chunks = chunkSubstr(dataUrl, CHUNK_SIZE);
  const metadata: Metadata = {
    now: Date.now() / 1000,
    name: file.name,
    size: dataUrl.length,
    type: file.type,
  };
  const id = btoa(JSON.stringify(metadata));

  socket.emit('metadata', { id, indexTotal: chunks.length });

  chunks.forEach((chunk, index) => {
    socket.emit('chunk', { data: chunk, id, index });
  });
});

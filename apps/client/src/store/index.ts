import { atom } from 'jotai';
import type { ChunkEvent, ClientMessage, Metadata, MetadataEvent, PeerId } from '@fileshare/shared';
import type { FileshareSocket, FileTransfer } from '@/types';
import { CHUNK_SIZE, chunkSubstr, decodeMetadata, readFileAsDataUrl } from '@/utils';

export const peersAtom = atom<Array<PeerId>>([]);
export const filesAtom = atom<Record<string, FileTransfer>>({});
export const socketAtom = atom<FileshareSocket | null>(null);

export const setSocketAtom = atom(null, (_get, set, socket: FileshareSocket | null) => {
  set(socketAtom, socket);
});

export const setPeersAtom = atom(null, (_get, set, peers: Array<PeerId>) => {
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

  if (!socket || socket.readyState !== WebSocket.OPEN) {
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

  const metadataMessage: ClientMessage = {
    payload: { id, indexTotal: chunks.length },
    type: 'metadata',
  };

  socket.send(JSON.stringify(metadataMessage));

  chunks.forEach((chunk, index) => {
    const chunkMessage: ClientMessage = {
      payload: { data: chunk, id, index },
      type: 'chunk',
    };

    socket.send(JSON.stringify(chunkMessage));
  });
});

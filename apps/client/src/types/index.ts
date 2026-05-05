import type { ChunkEvent, Metadata } from '@fileshare/shared';

export type FileshareSocket = WebSocket;

export type FileTransfer = {
  id: string;
  indexTotal: number;
  chunks: Array<ChunkEvent>;
  metadata: Metadata;
};

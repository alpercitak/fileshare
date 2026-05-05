export type PeerId = string;

export type Metadata = {
  now: number;
  name: string;
  size: number;
  type: string;
};

export type MetadataEvent = {
  id: string;
  indexTotal: number;
};

export type ChunkEvent = {
  id: string;
  index: number | string;
  data: string;
};

export type FileTransfer = {
  id: string;
  indexTotal: number;
  chunks: Array<ChunkEvent>;
  metadata: Metadata;
};

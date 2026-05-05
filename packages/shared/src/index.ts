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

export type ClientMessage =
  | {
      type: 'getPeers';
    }
  | {
      type: 'metadata';
      payload: MetadataEvent;
    }
  | {
      type: 'chunk';
      payload: ChunkEvent;
    };

export type ServerMessage =
  | {
      type: 'peers';
      payload: Array<PeerId>;
    }
  | {
      type: 'metadata';
      payload: MetadataEvent;
    }
  | {
      type: 'chunk';
      payload: ChunkEvent;
    };

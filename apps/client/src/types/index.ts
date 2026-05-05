import type { DataChannelFileHeader, RoomCode } from '@fileshare/shared';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'failed';

interface Transfer {
  transferId: string;
  done: boolean;
}
export interface InboundTransfer extends Transfer {
  header: DataChannelFileHeader;
  chunks: Array<ArrayBuffer>;
  url: string | null;
}

export interface OutboundTransfer extends Transfer {
  name: string;
  totalChunks: number;
  sentChunks: number;
}

export interface WebRTCState {
  status: ConnectionStatus;
  roomCode: RoomCode | null;
  dataChannelOpen: boolean;
  inbound: Record<string, InboundTransfer>;
  outbound: Record<string, OutboundTransfer>;
  error: string | null;
  actions: {
    createRoom: () => void;
    joinRoom: (code: string) => void;
    sendFile: (file: File) => Promise<void>;
  };
}

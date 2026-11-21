import type { DataChannelFileHeader, RoomCode } from '@fileshare/shared';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected';

interface Transfer {
  transferId: string;
  done: boolean;
}

export interface InboundTransfer extends Transfer {
  header: DataChannelFileHeader;
  receivedChunks: number;
  url: string | null;
  savedTo: string | null;
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
  verificationCode: string | null;
  inbound: Record<string, InboundTransfer>;
  outbound: Record<string, OutboundTransfer>;
  error: string | null;
  saveFolder: string | null;
  actions: {
    createRoom: () => void;
    joinRoom: (code: string) => void;
    sendFile: (file: File) => Promise<void>;
    chooseSaveFolder?: () => Promise<void>; // only when the File System Access API is available
  };
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }
}

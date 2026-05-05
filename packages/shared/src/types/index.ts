export type PeerId = string;
export type RoomCode = string;

export type ClientMessage =
  | { type: 'createRoom' }
  | { type: 'joinRoom'; payload: { roomCode: RoomCode } }
  | { type: 'sdpOffer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit } }
  | { type: 'sdpAnswer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit } }
  | { type: 'iceCandidate'; payload: { roomCode: RoomCode; candidate: RTCIceCandidateInit } };

export type SignalingError = 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ROOM_EXPIRED';

export type ServerMessage =
  | { type: 'roomCreated'; payload: { roomCode: RoomCode } }
  | { type: 'roomJoined'; payload: { roomCode: RoomCode; peerId: PeerId } }
  | { type: 'peerJoined'; payload: { roomCode: RoomCode; peerId: PeerId } }
  | { type: 'sdpOffer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit; from: PeerId } }
  | { type: 'sdpAnswer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit; from: PeerId } }
  | { type: 'iceCandidate'; payload: { roomCode: RoomCode; candidate: RTCIceCandidateInit; from: PeerId } }
  | { type: 'peerLeft'; payload: { roomCode: RoomCode; peerId: PeerId } }
  | { type: 'error'; payload: { code: SignalingError; message: string } };

export type DataChannelHandshake = {
  type: 'handshake';
  publicKey: JsonWebKey;
};

export type DataChannelFileHeader = {
  type: 'fileHeader';
  transferId: string;
  name: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
};

export type DataChannelFileComplete = {
  type: 'fileComplete';
  transferId: string;
  checksum: string;
};

export type DataChannelPause = { type: 'pause'; transferId: string };
export type DataChannelResume = { type: 'resume'; transferId: string };
export type DataChannelCancel = { type: 'cancel'; transferId: string };

export type DataChannelMessage =
  | DataChannelHandshake
  | DataChannelFileHeader
  | DataChannelFileComplete
  | DataChannelPause
  | DataChannelResume
  | DataChannelCancel;

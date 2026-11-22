export type PeerId = string;
export type RoomCode = string;

export type ClientMessage =
  | { type: 'createRoom' }
  | { type: 'leaveRoom' }
  | { type: 'joinRoom'; payload: { roomCode: RoomCode } }
  | { type: 'sdpOffer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit } }
  | { type: 'sdpAnswer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit } }
  | { type: 'iceCandidate'; payload: { roomCode: RoomCode; candidate: RTCIceCandidateInit } };

export type SignalingError = 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ROOM_EXPIRED' | 'INVALID_MESSAGE' | 'ALREADY_IN_ROOM';

export type ServerMessage =
  | { type: 'roomCreated'; payload: { roomCode: RoomCode } }
  | { type: 'roomJoined'; payload: { roomCode: RoomCode; peerId: PeerId } }
  | { type: 'peerJoined'; payload: { roomCode: RoomCode; peerId: PeerId } }
  | { type: 'sdpOffer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit; from: PeerId } }
  | { type: 'sdpAnswer'; payload: { roomCode: RoomCode; sdp: RTCSessionDescriptionInit; from: PeerId } }
  | { type: 'iceCandidate'; payload: { roomCode: RoomCode; candidate: RTCIceCandidateInit; from: PeerId } }
  | { type: 'peerLeft'; payload: { roomCode: RoomCode; peerId: PeerId } }
  | { type: 'error'; payload: { code: SignalingError; message: string } };

export type DataChannelCommit = {
  type: 'commit';
  hash: string;
};

export type DataChannelHandshake = {
  type: 'handshake';
  publicKey: JsonWebKey;
};

export type DataChannelAbort = {
  type: 'abort';
  transferId: string;
  reason: string;
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

export type DataChannelMessage = DataChannelCommit | DataChannelHandshake | DataChannelFileHeader | DataChannelAbort;

export const BUFFERED_AMOUNT_HIGH = 1024 * 1024; // 1MB backpressure threshold
export const BUFFERED_AMOUNT_LOW = 256 * 1024; // 256KB resume threshold
export const CHUNK_SIZE = 64 * 1024; // 64KB
export const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
export const MAX_SAVE_NAME_TRIES = 100; // "name (1)" … "name (99)" before falling back to memory
export const SIGNALING_RETRY_BASE_MS = 1000; // first reconnect delay, doubled per failed attempt
export const SIGNALING_RETRY_MAX_MS = 10_000;

import type { DCFileHeader } from '@fileshare/shared';

export const encodeFrame = (index: number, data: ArrayBuffer): ArrayBuffer => {
  const frame = new ArrayBuffer(4 + data.byteLength);
  new DataView(frame).setUint32(0, index, false);
  new Uint8Array(frame).set(new Uint8Array(data), 4);
  return frame;
};

export const decodeFrame = (frame: ArrayBuffer): { index: number; data: ArrayBuffer } => {
  const index = new DataView(frame).getUint32(0, false);
  return { index, data: frame.slice(4) };
};

export const assembleFile = (header: DCFileHeader, chunks: ArrayBuffer[]): File => {
  const ordered = [...chunks]; // already indexed in order by receiver
  return new File(ordered, header.name, { type: header.mimeType });
};

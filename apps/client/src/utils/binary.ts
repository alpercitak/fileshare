import type { DataChannelFileHeader } from '@fileshare/shared';

export const encodeFrame = (index: number, data: ArrayBuffer): ArrayBuffer => {
  const frame = new ArrayBuffer(4 + data.byteLength);
  new DataView(frame).setUint32(0, index, false);
  new Uint8Array(frame).set(new Uint8Array(data), 4);
  return frame;
};

export const decodeFrame = (frame: ArrayBuffer): { index: number; data: ArrayBuffer } => ({
  index: new DataView(frame).getUint32(0, false),
  data: frame.slice(4),
});

export const assembleFile = (header: DataChannelFileHeader, chunks: Array<ArrayBuffer>): File =>
  new File([...chunks], header.name, { type: header.mimeType });

import { describe, expect, test } from 'bun:test';
import { decodeFrame, encodeFrame } from '../src/utils/binary';

describe('encodeFrame / decodeFrame', () => {
  test.each([0, 1, 2 ** 31])('round-trips index %p and bytes', (index) => {
    const data = new Uint8Array([1, 2, 3, 250, 255]).buffer;

    const decoded = decodeFrame(encodeFrame(index, data));

    expect(decoded.index).toBe(index);
    expect(new Uint8Array(decoded.data)).toEqual(new Uint8Array(data));
  });
});

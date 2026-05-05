import type { ChunkEvent, Metadata } from '@fileshare/shared';
import type { FileTransfer } from '@/types';

export const CHUNK_SIZE = 10000;

export const decodeMetadata = (id: string): Metadata => JSON.parse(atob(id)) as Metadata;

export const chunkSubstr = (value: string, size: number): Array<string> => {
  const numChunks = Math.ceil(value.length / size);
  const chunks = new Array<string>(numChunks);

  for (let index = 0, offset = 0; index < numChunks; index += 1, offset += size) {
    chunks[index] = value.substring(offset, offset + size);
  }

  return chunks;
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
  });

export const compareChunkIndex = (left: ChunkEvent, right: ChunkEvent) => Number(left.index) - Number(right.index);

export const getLoadedSize = (file: FileTransfer) => file.chunks.reduce((total, chunk) => total + chunk.data.length, 0);

export const getTransferPercentage = (file: FileTransfer) => {
  if (file.metadata.size === 0) {
    return 0;
  }

  return Math.floor((getLoadedSize(file) / file.metadata.size) * 100);
};

export const getDownloadHref = (file: FileTransfer) => {
  const isComplete = file.indexTotal === file.chunks.length;

  if (!isComplete) {
    return null;
  }

  return file.chunks
    .slice()
    .sort(compareChunkIndex)
    .map((chunk) => chunk.data)
    .join('');
};

import { MAX_SAVE_NAME_TRIES } from '@/constants';

export interface FileSink {
  dir: FileSystemDirectoryHandle;
  name: string;
  writer: WritableStreamDefaultWriter<FileSystemWriteChunkType>;
}

const nameWithSuffix = (name: string, n: number) => {
  if (n === 0) {
    return name;
  }
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
};

const createSink = async (dir: FileSystemDirectoryHandle, name: string): Promise<FileSink | null> => {
  try {
    let free: string | null = null;
    for (let n = 0; n < MAX_SAVE_NAME_TRIES && free === null; n++) {
      const candidate = nameWithSuffix(name, n);
      try {
        await dir.getFileHandle(candidate);
      } catch (error) {
        if (!(error instanceof DOMException)) {
          throw error;
        }
        if (error.name === 'NotFoundError') {
          free = candidate;
        } else if (error.name !== 'TypeMismatchError') {
          throw error; // TypeMismatchError: a folder has that name, try the next suffix
        }
      }
    }
    if (free === null) {
      return null;
    }
    const handle = await dir.getFileHandle(free, { create: true });
    return { dir, name: free, writer: (await handle.createWritable()).getWriter() };
  } catch {
    // Peer-supplied name rejected (e.g. "..", contains "/"), permission revoked, or too many copies: caller buffers in memory instead
    return null;
  }
};

// Opens run one at a time so two incoming files with the same name can't both claim it.
let openQueue: Promise<unknown> = Promise.resolve();

export const openFileSink = (dir: FileSystemDirectoryHandle, name: string): Promise<FileSink | null> => {
  const next = openQueue.then(() => createSink(dir, name));
  openQueue = next;
  return next;
};

// Abort a partial file and remove it, since creating it already left an empty file in the folder.
export const discardFileSink = (sink: FileSink) => sink.writer.abort().finally(() => sink.dir.removeEntry(sink.name));

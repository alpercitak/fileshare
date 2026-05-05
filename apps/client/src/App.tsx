import { useEffect, useRef, useState } from 'preact/hooks';
import { io, type Socket } from 'socket.io-client';

type PeerId = string;

type Metadata = {
  now: number;
  name: string;
  size: number;
  type: string;
};

type MetadataEvent = {
  id: string;
  indexTotal: number;
};

type ChunkEvent = {
  id: string;
  index: number | string;
  data: string;
};

type FileTransfer = {
  id: string;
  indexTotal: number;
  chunks: ChunkEvent[];
  metadata: Metadata;
};

const SOCKET_HOST = 'localhost:4001';
const CHUNK_SIZE = 10000;

const decodeMetadata = (id: string): Metadata => JSON.parse(atob(id)) as Metadata;

const chunkSubstr = (value: string, size: number): string[] => {
  const numChunks = Math.ceil(value.length / size);
  const chunks = new Array<string>(numChunks);

  for (let index = 0, offset = 0; index < numChunks; index += 1, offset += size) {
    chunks[index] = value.substring(offset, offset + size);
  }

  return chunks;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file.'));
  });

const compareChunkIndex = (left: ChunkEvent, right: ChunkEvent) => Number(left.index) - Number(right.index);

const App = () => {
  const socketRef = useRef<Socket | null>(null);
  const [peers, setPeers] = useState<PeerId[]>([]);
  const [files, setFiles] = useState<Record<string, FileTransfer>>({});

  useEffect(() => {
    const socket = io(`ws://${SOCKET_HOST}`, {
      forceNew: true,
      query: {},
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('getPeers');
    });

    socket.on('getPeers', (ids: PeerId[]) => {
      setPeers(ids);
    });

    socket.on('metadata', (data: MetadataEvent) => {
      const metadata = decodeMetadata(data.id);

      setFiles((currentFiles) => ({
        ...currentFiles,
        [data.id]: currentFiles[data.id] ?? {
          chunks: [],
          id: data.id,
          indexTotal: data.indexTotal,
          metadata,
        },
      }));
    });

    socket.on('chunk', (data: ChunkEvent) => {
      setFiles((currentFiles) => {
        const currentFile = currentFiles[data.id];

        if (!currentFile) {
          return currentFiles;
        }

        return {
          ...currentFiles,
          [data.id]: {
            ...currentFile,
            chunks: [...currentFile.chunks, data],
          },
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !socketRef.current) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const chunks = chunkSubstr(dataUrl, CHUNK_SIZE);
    const metadata: Metadata = {
      now: Date.now() / 1000,
      name: file.name,
      size: dataUrl.length,
      type: file.type,
    };
    const id = btoa(JSON.stringify(metadata));

    socketRef.current.emit('metadata', { id, indexTotal: chunks.length });

    chunks.forEach((chunk, index) => {
      socketRef.current?.emit('chunk', { data: chunk, id, index });
    });

    input.value = '';
  };

  const fileItems = Object.values(files);

  return (
    <div id="container">
      <div id="peers">
        <div class="item">Peers ({peers.length})</div>
        {peers.map((peerId) => (
          <div class="item" key={peerId}>
            {peerId}
          </div>
        ))}
      </div>

      <div id="files">
        <div class="item">
          <input class="file-picker" type="file" onChange={handleFileChange} />
        </div>

        {fileItems.map((file) => {
          const loadedSize = file.chunks.reduce((total, chunk) => total + chunk.data.length, 0);
          const percentage = file.metadata.size === 0 ? 0 : Math.floor((loadedSize / file.metadata.size) * 100);
          const isComplete = file.indexTotal === file.chunks.length;
          const downloadHref = isComplete
            ? file.chunks
                .slice()
                .sort(compareChunkIndex)
                .map((chunk) => chunk.data)
                .join('')
            : null;

          return (
            <div
              key={file.id}
              class={`item${file.chunks.length > 0 ? ' progress' : ''}`}
              style={{ width: `${percentage}%` }}
            >
              <span class="file-name">{file.metadata.name}</span>
              <span class="file-progress">
                {percentage} / 100%
                {downloadHref ? (
                  <>
                    {' '}
                    <a href={downloadHref} download={file.metadata.name}>
                      Download
                    </a>
                  </>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;

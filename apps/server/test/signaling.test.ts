import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import type { ClientMessage, RoomCode, ServerMessage } from '@fileshare/shared';

const SERVER_DIR = `${import.meta.dir}/..`;
const MESSAGE_TIMEOUT_MS = 2000;
const START_TIMEOUT_MS = 5000;
const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

type Client = {
  send: (data: ClientMessage | string) => void;
  next: () => Promise<ServerMessage>;
  close: () => void;
};

const port = 40000 + Math.floor(Math.random() * 10000);
const url = `ws://localhost:${port}`;
let server: Bun.Subprocess<'ignore', 'pipe', 'inherit'>;
const clients: Client[] = [];

const waitForStart = async (proc: Bun.Subprocess<'ignore', 'pipe', 'inherit'>) => {
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let output = '';
  while (!output.includes('started')) {
    const { done, value } = await reader.read();
    if (done) throw new Error('server exited before starting');
    output += decoder.decode(value, { stream: true });
  }
};

const connect = (): Promise<Client> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const queue: ServerMessage[] = [];
    const waiters: Array<(message: ServerMessage) => void> = [];

    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      const waiter = waiters.shift();
      if (waiter) waiter(message);
      else queue.push(message);
    };

    const client: Client = {
      send: (data) => ws.send(typeof data === 'string' ? data : JSON.stringify(data)),
      next: () => {
        const queued = queue.shift();
        if (queued) return Promise.resolve(queued);
        return new Promise((resolveNext, rejectNext) => {
          const waiter = (message: ServerMessage) => {
            clearTimeout(timer);
            resolveNext(message);
          };
          const timer = setTimeout(() => {
            waiters.splice(waiters.indexOf(waiter), 1);
            rejectNext(new Error('timed out waiting for message'));
          }, MESSAGE_TIMEOUT_MS);
          waiters.push(waiter);
        });
      },
      close: () => ws.close(),
    };

    ws.onopen = () => {
      clients.push(client);
      resolve(client);
    };
    ws.onerror = () => reject(new Error(`could not connect to ${url}`));
  });

const openRoom = async (initiator: Client): Promise<RoomCode> => {
  initiator.send({ type: 'createRoom' });
  const message = await initiator.next();
  if (message.type !== 'roomCreated') throw new Error(`unexpected ${JSON.stringify(message)}`);
  return message.payload.roomCode;
};

// creates a room on `initiator` and joins it with a new socket, draining the handshake messages
const pair = async () => {
  const initiator = await connect();
  const roomCode = await openRoom(initiator);
  const joiner = await connect();
  joiner.send({ type: 'joinRoom', payload: { roomCode } });
  await joiner.next();
  await initiator.next();
  return { initiator, joiner, roomCode };
};

beforeAll(async () => {
  server = Bun.spawn(['bun', 'src/index.ts'], {
    cwd: SERVER_DIR,
    env: { ...process.env, PORT: String(port) },
    stdout: 'pipe',
  });
  let timer: Timer | undefined;
  await Promise.race([
    waitForStart(server),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('server did not start')), START_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
});

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

afterAll(async () => {
  server.kill();
  await server.exited;
});

describe('signaling server', () => {
  test('malformed JSON returns INVALID_MESSAGE', async () => {
    const client = await connect();
    client.send('not json');
    expect(await client.next()).toMatchObject({ type: 'error', payload: { code: 'INVALID_MESSAGE' } });
  });

  test('createRoom returns a 6-char room code', async () => {
    const client = await connect();
    const roomCode = await openRoom(client);
    expect(roomCode).toMatch(ROOM_CODE_PATTERN);
  });

  test('second createRoom on the same socket returns ALREADY_IN_ROOM', async () => {
    const client = await connect();
    await openRoom(client);
    client.send({ type: 'createRoom' });
    expect(await client.next()).toMatchObject({ type: 'error', payload: { code: 'ALREADY_IN_ROOM' } });
  });

  test('joinRoom notifies both peers and a third peer gets ROOM_FULL', async () => {
    const initiator = await connect();
    const roomCode = await openRoom(initiator);
    const joiner = await connect();
    joiner.send({ type: 'joinRoom', payload: { roomCode } });

    const joined = await joiner.next();
    const peerJoined = await initiator.next();
    expect(joined).toMatchObject({ type: 'roomJoined', payload: { roomCode } });
    expect(peerJoined).toMatchObject({ type: 'peerJoined', payload: { roomCode } });
    if (joined.type !== 'roomJoined' || peerJoined.type !== 'peerJoined') throw new Error('unexpected message');
    expect(peerJoined.payload.peerId).toBe(joined.payload.peerId);

    const third = await connect();
    third.send({ type: 'joinRoom', payload: { roomCode } });
    expect(await third.next()).toMatchObject({ type: 'error', payload: { code: 'ROOM_FULL' } });
  });

  test('sdpOffer from initiator is relayed to joiner with from', async () => {
    const { initiator, joiner, roomCode } = await pair();
    const sdp = { type: 'offer', sdp: 'v=0' } as const;

    initiator.send({ type: 'sdpOffer', payload: { roomCode, sdp } });

    const relayed = await joiner.next();
    expect(relayed).toMatchObject({ type: 'sdpOffer', payload: { roomCode, sdp } });
    if (relayed.type !== 'sdpOffer') throw new Error('unexpected message');
    expect(typeof relayed.payload.from).toBe('string');
  });

  test('leaveRoom notifies the other peer and both can create rooms again', async () => {
    const { initiator, joiner, roomCode } = await pair();

    joiner.send({ type: 'leaveRoom' });
    expect(await initiator.next()).toMatchObject({ type: 'peerLeft', payload: { roomCode } });

    expect(await openRoom(initiator)).toMatch(ROOM_CODE_PATTERN);
    expect(await openRoom(joiner)).toMatch(ROOM_CODE_PATTERN);
  });

  test('closing a socket notifies the other peer', async () => {
    const { initiator, joiner, roomCode } = await pair();

    joiner.close();

    expect(await initiator.next()).toMatchObject({ type: 'peerLeft', payload: { roomCode } });
  });

  test('joining an unknown room returns ROOM_NOT_FOUND', async () => {
    const client = await connect();
    // '0' is not in the room code alphabet, so this code can never exist
    client.send({ type: 'joinRoom', payload: { roomCode: '000000' } });
    expect(await client.next()).toMatchObject({ type: 'error', payload: { code: 'ROOM_NOT_FOUND' } });
  });
});

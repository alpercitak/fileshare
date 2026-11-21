import { describe, expect, test } from 'bun:test';
import {
  decryptChunk,
  deriveSharedKey,
  encryptChunk,
  generateKeyPair,
  getVerificationCode,
  hashJwk,
} from '../src/utils/crypto';

const enc = (text: string) => new TextEncoder().encode(text);

describe('deriveSharedKey / encryptChunk / decryptChunk', () => {
  test('both sides derive the same key and decrypt each other', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const aliceJwk = await crypto.subtle.exportKey('jwk', alice.publicKey);
    const bobJwk = await crypto.subtle.exportKey('jwk', bob.publicKey);
    const aad = enc('transfer-1:0');
    const plaintext = new Uint8Array([10, 20, 30, 40]).buffer;

    const aliceKey = await deriveSharedKey(alice.privateKey, bobJwk);
    const bobKey = await deriveSharedKey(bob.privateKey, aliceJwk);

    const encrypted = await encryptChunk(aliceKey, plaintext, aad);
    const decrypted = await decryptChunk(bobKey, encrypted, aad);
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(plaintext));

    const reply = await encryptChunk(bobKey, plaintext, aad);
    const replyDecrypted = await decryptChunk(aliceKey, reply, aad);
    expect(new Uint8Array(replyDecrypted)).toEqual(new Uint8Array(plaintext));
  });

  test('decrypt rejects when aad differs', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const aliceJwk = await crypto.subtle.exportKey('jwk', alice.publicKey);
    const bobJwk = await crypto.subtle.exportKey('jwk', bob.publicKey);
    const aliceKey = await deriveSharedKey(alice.privateKey, bobJwk);
    const bobKey = await deriveSharedKey(bob.privateKey, aliceJwk);
    const plaintext = enc('chunk').buffer;

    const encrypted = await encryptChunk(aliceKey, plaintext, enc('transfer-1:0'));

    await expect(decryptChunk(bobKey, encrypted, enc('transfer-1:1'))).rejects.toThrow();
    await expect(decryptChunk(bobKey, encrypted, enc('transfer-2:0'))).rejects.toThrow();
  });
});

describe('hashJwk', () => {
  test('is deterministic and differs for different keys', async () => {
    const a = await crypto.subtle.exportKey('jwk', (await generateKeyPair()).publicKey);
    const b = await crypto.subtle.exportKey('jwk', (await generateKeyPair()).publicKey);

    expect(await hashJwk(a)).toBe(await hashJwk(a));
    expect(await hashJwk(a)).not.toBe(await hashJwk(b));
  });
});

describe('getVerificationCode', () => {
  test('is order-independent and formatted as two hex groups', async () => {
    const a = await crypto.subtle.exportKey('jwk', (await generateKeyPair()).publicKey);
    const b = await crypto.subtle.exportKey('jwk', (await generateKeyPair()).publicKey);

    const code = await getVerificationCode(a, b);

    expect(code).toMatch(/^[0-9a-f]{4} [0-9a-f]{4}$/);
    expect(await getVerificationCode(b, a)).toBe(code);
  });
});

const KEY_ALGORITHM = {
  name: 'ECDH',
  namedCurve: 'P-256',
} as const;

const IV_LENGTH = 12 as const; // AES-GCM standard IV length

const getEncryptionAlgorithm = (iv: Uint8Array, additionalData: Uint8Array) => ({
  name: 'AES-GCM',
  iv,
  additionalData,
});

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

export const generateKeyPair = () => crypto.subtle.generateKey(KEY_ALGORITHM, true, ['deriveKey']);

export const deriveSharedKey = (privateKey: CryptoKey, publicKeyJwk: JsonWebKey) =>
  crypto.subtle
    .importKey('jwk', publicKeyJwk, KEY_ALGORITHM, false, [])
    .then((publicKey) =>
      crypto.subtle.deriveKey(
        { name: 'ECDH', public: publicKey },
        privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      ),
    );

export const hashJwk = async (jwk: JsonWebKey): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${jwk.x}${jwk.y}`)));

export const encryptChunk = async (key: CryptoKey, data: ArrayBuffer, aad: Uint8Array): Promise<ArrayBuffer> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(getEncryptionAlgorithm(iv, aad), key, data);
  // prepend iv to ciphertext
  const out = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(encrypted), IV_LENGTH);
  return out.buffer;
};

export const decryptChunk = async (key: CryptoKey, data: ArrayBuffer, aad: Uint8Array): Promise<ArrayBuffer> => {
  const iv = new Uint8Array(data, 0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  return crypto.subtle.decrypt(getEncryptionAlgorithm(iv, aad), key, ciphertext);
};

export const getVerificationCode = async (a: JsonWebKey, b: JsonWebKey): Promise<string> => {
  const [first, second] = [`${a.x}${a.y}`, `${b.x}${b.y}`].sort();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(first + second));
  const hex = toHex(digest.slice(0, 4));
  return hex.match(/.{4}/g)?.join(' ') ?? hex;
};

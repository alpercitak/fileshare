export const generateKeyPair = () =>
  crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);

export const deriveSharedKey = (privateKey: CryptoKey, publicKeyJwk: JsonWebKey) =>
  crypto.subtle
    .importKey('jwk', publicKeyJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
    .then((publicKey) =>
      crypto.subtle.deriveKey(
        { name: 'ECDH', public: publicKey },
        privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      ),
    );

export const encryptChunk = async (key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  // prepend iv to ciphertext
  const out = new Uint8Array(12 + encrypted.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(encrypted), 12);
  return out.buffer;
};

export const decryptChunk = async (key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> => {
  const iv = new Uint8Array(data, 0, 12);
  const ciphertext = data.slice(12);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
};

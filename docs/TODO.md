# TODO

## client

- [ ] Concurrent multi-file send interleaves chunks and corrupts files (single `activeHeaderRef`; `files.forEach(sendFile)`).
- [ ] ECDH handshake race: peer key is dropped if it arrives before own keypair is generated.
- [ ] `BUFFERED_AMOUNT_HIGH` (16MB) equals Chrome's send-queue limit; use ~1MB and `bufferedamountlow`.
- [ ] O(n²) receive path (array copy + filter per chunk) and whole file held in RAM.
- [ ] Per-chunk `setOutbound` re-render.
- [ ] Object URLs are never revoked.
- [ ] `peerLeft` is not handled.
- [ ] Hard-coded `ws://` breaks under HTTPS.
- [ ] ECDH keys are unauthenticated (signaling server can MITM); add a short verification code.
- [ ] Chunk index is not bound via AES-GCM additional data; no whole-file checksum (`fileComplete` is unused).
- [ ] Remove unused `jotai` dependency.

## server

- [ ] Unguarded `JSON.parse` and no message validation.
- [ ] Unlimited `createRoom` per socket.
- [ ] Peer can join its own room.
- [ ] `Math.random` room codes; switch to `crypto.getRandomValues`.
- [ ] Close handler scans all rooms.

## tooling

- [ ] No tests, although CI runs `--test`.
- [ ] Turbo `test` task is marked `persistent`.
- [ ] No typecheck or lint in CI.
- [ ] nginx has no gzip.
- [ ] Server image copies full `node_modules` although the server is bundled.
- [ ] Upgrade `turbo` (2.9.9 → latest 2.11).
- [ ] Clean up `biome check` findings: organizeImports (`useWebRTC.ts`, `vite.config.ts`), `useNodejsImportProtocol` (`vite.config.ts`), `noNonNullAssertion` (`main.tsx`), `noExplicitAny` (`shared/utils`), a11y in `file-drop`, formatting in `README.md` and `build.yaml`.

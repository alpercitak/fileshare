# TODO

## client

- [ ] Received file is held fully in RAM until assembled (needs streaming to disk for very large files).
- [ ] Empty file (0 chunks) never completes on the receiver.
- [ ] Object URLs are never revoked.
- [ ] `peerLeft` is not handled (a send waiting on `bufferedamountlow` hangs and blocks the send queue when the channel closes).
- [ ] Answerer: files dropped before `ondatachannel` fires are discarded (no shared key yet); consider showing `FileDrop` only once the channel is open.
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
- [ ] Clean up `biome check` findings: organizeImports (`vite.config.ts`), `useNodejsImportProtocol` (`vite.config.ts`), `noNonNullAssertion` (`main.tsx`), `noExplicitAny` (`shared/utils`), a11y in `file-drop`, formatting in `README.md` and `build.yaml`.

# TODO

## client

- [ ] Received file is held fully in RAM until assembled (needs streaming to disk for very large files).
- [ ] Object URLs are never revoked.
- [ ] Channel close or ICE failure without `peerLeft` leaves the UI stuck (no leave/reset path; stale verification code stays visible).
- [ ] Verification code has no commitment, so it needs 128 bits to resist key grinding; a ZRTP-style commit/reveal handshake would allow a short code.
- [ ] Chunk index is not bound via AES-GCM additional data; no whole-file checksum (`fileComplete` is unused).
- [ ] HTTPS deploy needs TLS for the signaling port (or an nginx `wss` proxy) now that the client uses `wss://` on https pages.

## server

- [ ] Room TTL expiry is silent: `ROOM_EXPIRED` is never sent, so the initiator waits forever.

## tooling

- [ ] No tests, although CI runs `--test`.

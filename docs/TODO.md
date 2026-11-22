# TODO

## client

- [ ] Receivers can't slow the sender: if disk writes (folder or service worker download) fall behind the data channel, chunks queue in memory. Fixing it needs receiver acks in the protocol (`packages/shared`) and a send window in `useWebRTC`.
- [ ] The service worker download path is only checked in Chromium; confirm it in Firefox, Safari and Android.

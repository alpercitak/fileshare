# TODO

## client

- [ ] Receivers that haven't opted into saving to disk still buffer whole files in memory until they click download.
- [ ] Streamed downloads (service worker path) have no backpressure: if the browser writes slower than chunks arrive, they queue in the worker's memory.
- [ ] The service worker download path is only checked in Chromium; confirm it in Firefox, Safari and Android.

## docker

- [ ] HTTPS needs TLS termination in front of nginx (it listens on :80 only); signaling already follows the page protocol via `/ws`.

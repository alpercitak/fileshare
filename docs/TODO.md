# TODO

## client

- [ ] Received file is held fully in RAM until assembled (needs streaming to disk for very large files).

## docker

- [ ] HTTPS needs TLS termination in front of nginx (it listens on :80 only); signaling already follows the page protocol via `/ws`.

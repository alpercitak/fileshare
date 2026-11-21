# TODO

## client

- [ ] Receivers without the File System Access API (Firefox, Safari, Brave, Android) or without a chosen folder still buffer whole files in memory.
- [ ] A transfer that fails on one side is not reported to the other: if the sender can't read the file, the receiver stays at "Receiving"; if a chunk fails verification or the disk write fails, the sender still shows "Sent" (needs an abort `DataChannelMessage`).
- [ ] No reconnect when the signaling WebSocket drops (server restart): the client can't create or join rooms until reload, and `leaveRoom` is sent on a closed socket.

## docker

- [ ] HTTPS needs TLS termination in front of nginx (it listens on :80 only); signaling already follows the page protocol via `/ws`.

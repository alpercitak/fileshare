# TODO

## client

- [ ] Receivers without the File System Access API (Firefox, Safari, Brave, Android) or without a chosen folder still buffer whole files in memory.
- [ ] A failed disk write or close (disk full, permission revoked, Safe Browsing rejection) leaves the transfer stuck at "Receiving" with no error shown.

## docker

- [ ] HTTPS needs TLS termination in front of nginx (it listens on :80 only); signaling already follows the page protocol via `/ws`.
- [ ] An interrupted inbound transfer stays at "Receiving" after the connection resets.

# Fileshare

**Direct browser-to-browser payloads via WebRTC. Hardened with AES-GCM 256 & ECDH.**

`fileshare` is a high-performance, zero-knowledge file distribution utility. It demonstrates advanced orchestration of browser-native APIs to achieve secure, serverless data streaming with a focus on memory efficiency and cryptographic integrity.

### Operational Overview

*   **Runtime:** Optimized for **Bun** (Fastest JS all-in-one toolkit).
*   **Networking:** WebRTC DataChannels (P2P) orchestrated via WebSockets.
*   **Security:** WebCrypto API for hardware-accelerated AES-GCM 256-bit encryption.
*   **Privacy:** ECDH (Elliptic Curve Diffie-Hellman) key exchange for zero-knowledge transfers.
*   **Interface:** Matte-phosphor industrial UI built with Preact and CSS Modules.

---

### Technical Specification

| Layer | Technology | Implementation |
| :--- | :--- | :--- |
| **Runtime** | Bun | Used for high-speed dependency management and bundling. |
| **Frontend** | Preact + TS | Reactive state management for real-time progress tracking. |
| **Transport** | WebRTC | Direct Peer-to-Peer DataChannels to bypass server bottlenecks. |
| **Signaling** | WebSockets | Lightweight node discovery and session negotiation. |
| **Security** | WebCrypto | Native AES-256-GCM encryption with chunk-level integrity. |

### Security Architecture

This system utilizes a **zero-knowledge** architecture. File data never touches a server; the WebSocket signaling layer only facilitates the initial metadata handshake.

1.  **Peer Discovery:** Nodes connect to a signaling room via WebSockets.
2.  **Key Exchange:** Peers derive a shared secret locally using **ECDH**; private keys never leave the client.
3.  **Encrypted Stream:** Files are fragmented into binary chunks, encrypted, and pushed through the WebRTC pipe.
4.  **Hardware Acceleration:** Utilizes native `window.crypto` for low-latency encryption that doesn't block the UI thread.

---

### Development

```bash
git clone https://github.com/alpercitak/fileshare
cd aphelion
bun install
bun run dev
```

---

### License
 
MIT

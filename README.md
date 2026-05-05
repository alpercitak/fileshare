# Fileshare

![WebRTC](https://img.shields.io/badge/WebRTC-000000?style=flat-square&logo=webrtc&logoColor=white)
![WebCrypto](https://img.shields.io/badge/WebCrypto-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Security](https://img.shields.io/badge/E2EE_Safe-2ea44f?style=flat-square)
![Build](https://img.shields.io/github/actions/workflow/status/alpercitak/fileshare/build.yaml?style=flat-square&label=&color=2ea44f)
![License](https://img.shields.io/badge/MIT-2ea44f?style=flat-square)

**Direct browser-to-browser payloads via WebRTC. Hardened with AES-GCM 256 & ECDH.**

`fileshare` is a high-performance, zero-knowledge file distribution utility. It demonstrates advanced orchestration of browser-native APIs to achieve secure, serverless data streaming with a focus on memory efficiency and cryptographic integrity.

---

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

---

### Engineering Highlights

*   **Asynchronous Backpressure Management**: Implements a manual flow-control loop using `bufferedAmount`. By monitoring the `RTCDataChannel` buffer and pausing the stream when it exceeds **16MB** (`BUFFERED_AMOUNT_HIGH`), the system prevents memory overflow and packet loss during high-speed transfers.
*   **Zero-Knowledge Key Exchange**: Leverages **ECDH (P-256)** to derive a shared secret locally. The signaling server brokers the handshake but is cryptographically incapable of deriving the session key or viewing the file data.
*   **Atomic Binary Framing**: Utilizes custom `encodeFrame` and `decodeFrame` utilities to handle binary chunk indexing. This ensures file integrity and proper reassembly even when dealing with massive binary streams.
*   **Hardware-Accelerated Encryption**: Uses the native **WebCrypto API** for **AES-GCM 256-bit** encryption. This offloads cryptographic tasks to the browser's optimized background processes, ensuring the UI remains responsive at 60fps during transfers.
*   **Memory-Efficient Chunking**: Fragments files into **64KB** chunks using `Blob.slice()` and `ArrayBuffer`. This allows the application to transfer multi-gigabyte files without exceeding the browser's heap limit or crashing the tab.

---

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
cd fileshare
bun install
bun run dev
```

---

### License
 
MIT

# 🎙 LAN Voice

> A Discord-like voice and text chat for your local network. No internet, no accounts, no servers in the cloud.

![Node](https://img.shields.io/badge/Node.js-14+-green?style=flat-square) ![Electron](https://img.shields.io/badge/Electron-34-blue?style=flat-square) ![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)

## ✨ Features

- 🎤 **Voice chat** — P2P audio via WebRTC, ultra-low latency
- 💬 **Text chat** — real-time messaging alongside voice
- 🖥 **Screen sharing** — share your screen with a floating, draggable viewer
- 🔊 **Per-user volume** — individual volume sliders (0–150%)
- 🌐 **Auto server discovery** — finds the host automatically via UDP broadcast
- 🏠 **Rooms** — create and join multiple rooms simultaneously
- 🎙 **Two mic modes** — auto voice detection (VOX) or Push-to-Talk (spacebar)
- 🔒 **HTTPS** — self-signed certificate, microphone works out of the box
- 🖥 **Electron app** — runs as a desktop app with system tray icon
- 📦 **Installer** — builds to a `.exe` installer via electron-builder

## 🚀 Quick Start

### Requirements
- [Node.js](https://nodejs.org) 14+
- All devices on the same Wi-Fi / LAN network

### Install

```bash
git clone https://github.com/triezo/lan-voice.git
cd lan-voice
npm install
```

### Run

**As a desktop app (Electron):**
```bash
npm start
```

**Server only (for browser access):**
```bash
npm run server
```

The server will print its address — e.g. `https://192.168.1.5:3000`. Share it with friends on your network. They just open it in a browser.

## 📡 How it works

```
User A ──┐
         ├── WebSocket signaling ──► Server (one PC)
User B ──┘

After handshake:
User A ◄──── WebRTC P2P audio/video ────► User B
             (server no longer involved)
```

The server is only needed for the initial peer handshake. All audio and screen share traffic flows directly between clients.

## ⚠️ Browser warning

On first open, your browser will show "Connection is not private" — this is expected since the certificate is self-signed. Click **Advanced → Proceed to site**. This only needs to be done once.

## 🛠 Tech Stack

- **WebRTC** — P2P audio and screen sharing
- **WebSocket** — signaling and text chat
- **Node.js + HTTPS** — server
- **UDP broadcast** — automatic server discovery
- **node-forge** — SSL certificate generation
- **Electron** — desktop wrapper with system tray

## 📋 Roadmap

- [ ] VOX threshold slider
- [ ] Audio latency tuning
- [ ] Password-protected rooms
- [ ] Game overlay (always on top)
- [ ] Auto-updater

## 🤝 Contributing

Pull requests are welcome. Feel free to open issues for bugs or feature requests.

---

Built with ❤️ and Claude 🤖

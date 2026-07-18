# 🎙 LAN Voice

> A Discord-like voice and text chat for your local network. No internet, no accounts, no cloud — one PC runs the server, everyone else just opens a link.

![Node](https://img.shields.io/badge/Node.js-16+-green?style=flat-square) ![Electron](https://img.shields.io/badge/Electron-34-blue?style=flat-square) ![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)

## ✨ Features

### Voice
- 🎤 **P2P audio** via WebRTC — ultra-low latency, traffic never touches the server
- 🎙 **Two mic modes** — auto voice detection (VOX) with adjustable threshold, or Push-to-Talk
- ⌨️ **Global PTT hotkey** — any key *or mouse button*, works even when the app is minimized or you're in a game (Electron)
- 🔇 **Keyboard noise gate** — auto-mutes your mic while you type, with adjustable release delay
- 🔊 **Per-user volume** — individual sliders with a real 0–150% boost (WebAudio gain)
- 🎧 **Device picker** — choose microphone and output device before connecting
- 🔔 **Join/leave sounds** and live speaking indicators

### Screen sharing
- 🖥 **Share your screen** — floating, draggable, resizable viewer with fullscreen mode
- 👥 **Multiple simultaneous shares** — each presenter gets their own window; late joiners see ongoing shares too
- ⏺ **Recording** — record any incoming share and save as MP4, MKV, WebM, MP3 or WAV (FFmpeg built in)

### Chat & channels
- 💬 **Text chat** with history — the server keeps the last 200 messages, so newcomers see the conversation
- 🏠 **Voice channels** — Discord-style channel list, create your own inline
- 😊 **Emoji picker**, message grouping, timestamps

### Quality of life
- 🌐 **Auto server discovery** — one click finds the host via UDP broadcast (Electron)
- 🔁 **Auto-reconnect** — network blip? You're back in your channel automatically
- 🌗 **Day / night themes** — dark mode and a retro-futuristic light palette
- 💾 **Remembers you** — name, host address, hotkey and VOX threshold persist between launches
- 🖥 **Electron app** with system tray, or plain browser — your choice
- 📦 Builds to a Windows installer via electron-builder

## 🚀 Quick Start

### Requirements
- [Node.js](https://nodejs.org) 16+ (only on the host PC)
- All devices on the same Wi-Fi / LAN

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

**Server only (friends connect from browsers):**
```bash
npm run server
```

The server prints its address — e.g. `https://192.168.1.5:3000`. Friends open it in any browser on the same network, enter a name, and they're in. No installs on their side.

## 📡 How it works

```
User A ──┐
         ├── WebSocket signaling ──► Server (one PC)
User B ──┘

After handshake:
User A ◄──── WebRTC P2P audio/screen ────► User B
             (server no longer involved)
```

The server only handles the initial handshake, text chat and presence. All audio and screen-share traffic flows directly between clients — it works with the internet cable unplugged.

## ⚠️ Browser warning

WebRTC and microphone access require HTTPS, so the server generates a self-signed certificate on first run. Your browser will show "Connection is not private" once — click **Advanced → Proceed to site** and you're done.

## 🛠 Tech Stack

- **WebRTC** — P2P audio and screen sharing (no STUN/TURN needed on a LAN)
- **WebSocket (ws)** — signaling, chat, presence
- **Node.js + HTTPS** — server with a self-signed cert (**node-forge**) because mic access requires a secure context
- **UDP broadcast** — automatic server discovery
- **uiohook-napi** — global keyboard/mouse hooks for background Push-to-Talk
- **MediaRecorder + ffmpeg-static** — screen-share recording and format conversion
- **Electron** — desktop wrapper with system tray

The client is **a single `index.html`** — no frameworks, no build step, vanilla JS. Open it, it works.

## 📋 Roadmap

- [ ] Mobile-friendly layout
- [ ] Real noise gate in VOX mode (stop transmitting below threshold)
- [ ] Per-channel text chats
- [ ] System audio in screen share
- [ ] Password-protected servers
- [ ] Game overlay (always on top)
- [ ] Auto-updater

## 🤝 Contributing

Pull requests are welcome. Feel free to open issues for bugs or feature requests.

---

Built with ❤️ and Claude 🤖

const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DISCOVERY_PORT = 3001;

// UDP Discovery — отвечаем на поиск клиентов
const dgram = require('dgram');
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
  if (msg.toString() === 'LAN_VOICE_DISCOVERY') {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const ips = Object.values(nets).flat().filter(n => n.family === 'IPv4' && !n.internal).map(n => n.address);
    const response = JSON.stringify({ type: 'LAN_VOICE_SERVER', ips, port: PORT });
    udpServer.send(response, rinfo.port, rinfo.address);
  }
});

udpServer.bind(DISCOVERY_PORT, '0.0.0.0', () => {
  udpServer.setBroadcast(true);
  console.log(`🔍 Discovery слушает на UDP :${DISCOVERY_PORT}`);
});

function getCert() {
  const certFile = path.join(__dirname, 'cert.pem');
  const keyFile  = path.join(__dirname, 'key.pem');
  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    return { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) };
  }
  console.log('🔐 Генерирую SSL сертификат...');
  let forge;
  try { forge = require('node-forge'); } catch(e) {
    console.error('❌ Запусти сначала: npm install node-forge');
    process.exit(1);
  }
  const pki = forge.pki;
  const keys = pki.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
  const attrs = [{ name: 'commonName', value: 'lan-voice' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  fs.writeFileSync(certFile, pki.certificateToPem(cert));
  fs.writeFileSync(keyFile, pki.privateKeyToPem(keys.privateKey));
  console.log('✅ Сертификат создан');
  return { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) };
}

const { cert, key } = getCert();

const server = https.createServer({ cert, key }, (req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('index.html not found');
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ server });
const rooms = {};
const clients = new Map();
const clientNames = new Map();
const chatHistory = []; // последние сообщения — новые участники видят переписку
const CHAT_HISTORY_LIMIT = 200;

function broadcast(roomId, data, excludeId = null) {
  if (!rooms[roomId]) return;
  rooms[roomId].forEach(id => {
    if (id === excludeId) return;
    const ws = clients.get(id);
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  });
}

function broadcastAll(data, excludeId = null) {
  clients.forEach((ws, id) => {
    if (id === excludeId) return;
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  });
}

function getRoomState() {
  return Object.entries(rooms).map(([id, members]) => ({
    id,
    members: [...members].map(uid => ({ id: uid, name: clientNames.get(uid) || 'Аноним' }))
  }));
}

function getOnlineList() {
  return [...clients.keys()]
    .filter(id => clientNames.has(id))
    .map(id => ({ id, name: clientNames.get(id) }));
}

let nextId = 1;

wss.on('connection', (ws) => {
  const clientId = String(nextId++);
  clients.set(clientId, ws);
  let currentRoom = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'hello') {
      clientNames.set(clientId, msg.name || 'Аноним');
      ws.send(JSON.stringify({ type: 'server-hello', id: clientId, rooms: getRoomState(), online: getOnlineList(), history: chatHistory }));
      broadcastAll({ type: 'user-online', id: clientId, name: msg.name || 'Аноним' }, clientId);
      console.log(`${msg.name || clientId} подключился к серверу`);
    }

    if (msg.type === 'join') {
      const roomId = msg.room || 'main';
      currentRoom = roomId;
      if (!rooms[roomId]) rooms[roomId] = new Set();
      const existingPeers = [...rooms[roomId]].map(id => ({ id, name: clientNames.get(id) || 'Аноним' }));
      rooms[roomId].add(clientId);
      ws.send(JSON.stringify({ type: 'room-peers', peers: existingPeers, room: roomId }));
      broadcast(roomId, { type: 'peer-joined', peerId: clientId, name: clientNames.get(clientId) || 'Аноним', room: roomId }, clientId);
      broadcastAll({ type: 'rooms-update', rooms: getRoomState() });
      console.log(`[${roomId}] ${clientNames.get(clientId) || clientId} вошёл. Всего: ${rooms[roomId].size}`);
    }

    if (msg.type === 'leave-room' && currentRoom) {
      if (rooms[currentRoom]) {
        rooms[currentRoom].delete(clientId);
        broadcast(currentRoom, { type: 'peer-left', peerId: clientId });
        if (rooms[currentRoom].size === 0) delete rooms[currentRoom];
      }
      currentRoom = null;
      broadcastAll({ type: 'rooms-update', rooms: getRoomState() });
    }

    if (msg.type === 'signal') {
      const targetWs = clients.get(msg.target);
      if (targetWs && targetWs.readyState === WebSocket.OPEN)
        targetWs.send(JSON.stringify({ type: 'signal', from: clientId, signal: msg.signal }));
    }

    if (msg.type === 'screen-start') {
      if (currentRoom) broadcast(currentRoom, { type: 'screen-start', peerId: clientId }, clientId);
    }
    if (msg.type === 'screen-stop') {
      if (currentRoom) broadcast(currentRoom, { type: 'screen-stop', peerId: clientId }, clientId);
    }
    if (msg.type === 'screen-signal') {
      const targetWs = clients.get(msg.target);
      if (targetWs && targetWs.readyState === WebSocket.OPEN)
        targetWs.send(JSON.stringify({ type: 'screen-signal', from: clientId, role: msg.role, signal: msg.signal }));
    }

    if (msg.type === 'chat') {
      if (msg.text && msg.text.trim()) {
        const entry = { peerId: clientId, name: clientNames.get(clientId) || 'Аноним', text: msg.text.slice(0, 2000), ts: Date.now() };
        chatHistory.push(entry);
        if (chatHistory.length > CHAT_HISTORY_LIMIT) chatHistory.shift();
        broadcastAll({ type: 'chat', ...entry }, clientId);
      }
    }

    if (msg.type === 'speaking') {
      if (currentRoom) broadcast(currentRoom, { type: 'speaking', peerId: clientId, active: msg.active }, clientId);
    }
  });

  ws.on('close', () => {
    const name = clientNames.get(clientId) || 'Аноним';
    clients.delete(clientId);
    clientNames.delete(clientId);
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].delete(clientId);
      broadcast(currentRoom, { type: 'peer-left', peerId: clientId });
      if (rooms[currentRoom].size === 0) delete rooms[currentRoom];
    }
    broadcastAll({ type: 'user-offline', id: clientId, name });
    broadcastAll({ type: 'rooms-update', rooms: getRoomState() });
    console.log(`${name} отключился`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  console.log(`\n🎙️  LAN Voice Chat (HTTPS)\n`);
  console.log(`Локальный адрес:  https://localhost:${PORT}`);
  Object.values(nets).flat().filter(n => n.family === 'IPv4' && !n.internal).forEach(n => {
    console.log(`Для локалки:      https://${n.address}:${PORT}`);
  });
  console.log(`\n⚠️  При первом открытии: "Дополнительно" → "Перейти на сайт"\n`);
});

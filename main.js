const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { fork, execFile } = require('child_process');
const https = require('https');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
const DISCOVERY_PORT = 3001;

function discoverServer() {
  return new Promise((resolve) => {
    const dgram = require('dgram');
    const client = dgram.createSocket('udp4');
    let found = false;

    client.bind(() => {
      client.setBroadcast(true);
      const msg = Buffer.from('LAN_VOICE_DISCOVERY');
      client.send(msg, DISCOVERY_PORT, '255.255.255.255');
    });

    client.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'LAN_VOICE_SERVER' && !found) {
          found = true;
          client.close();
          resolve(data);
        }
      } catch {}
    });

    setTimeout(() => {
      if (!found) {
        try { client.close(); } catch {}
        resolve(null);
      }
    }, 3000);
  });
}

ipcMain.handle('discover-server', async () => {
  return await discoverServer();
});
let tray = null;
let serverProcess = null;
let serverReady = false;

// ======================== SERVER ========================
function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  serverProcess = fork(serverPath, [], { silent: true });

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write('[server] ' + text);
    if (text.includes('запущен')) {
      serverReady = true;
      if (mainWindow) mainWindow.webContents.loadURL('https://localhost:3000');
    }
  });

  serverProcess.stderr.on('data', (data) => {
    process.stderr.write('[server err] ' + data.toString());
  });

  serverProcess.on('exit', (code) => {
    console.log('Сервер завершился с кодом:', code);
  });
}

// ======================== TRAY ICON (встроенная иконка) ========================
function createTrayIcon() {
  // Простая иконка 16x16 в формате PNG (base64)
  const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFUSURBVDiNpZM9SwNBEIafTSAkpEghWFiIhZ2VhYWFYCEiIiIiIiIiIiIiIiIiIiJiY2MjIiIiIiJiYyMiImJiYmJiYiIiImJiIiJiYiIiIiIiIiIiIiIiIiIiImJiYiIiIiJiYiIiIiIiImJiYiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiImJiYiIiIiJiYiIiIiIiImJiYiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiImJiYiIiIiJiYiIiIiIiImJiYiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiImJiYiIiIiJiYiIiIiIiImJiYiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiImJiYiIiIiJiYiIiIiIiImJiYiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiImJiYiIiIiJiYiIiIiIiA9XABQAAAABJRU5ErkJggg==';

  const img = nativeImage.createFromDataURL('data:image/png;base64,' + iconBase64);
  return img;
}

// ======================== WINDOW ========================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 700,
    minHeight: 500,
    title: 'LAN Voice',
    backgroundColor: '#0d0d0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: require('path').join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // Пока сервер стартует — показываем загрузку
  mainWindow.loadURL('data:text/html,<html style="background:#0d0d0f;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;color:#5b7cf6;font-size:14px"><div>🎙 Запускаю сервер...</div></html>');

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (serverReady) mainWindow.webContents.loadURL('https://localhost:3000');
    }, 1000);
  });
}

// ======================== TRAY ========================
function createTray() {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('LAN Voice');

  const updateMenu = () => {
    const menu = Menu.buildFromTemplate([
      { label: 'LAN Voice', enabled: false },
      { type: 'separator' },
      {
        label: mainWindow && mainWindow.isVisible() ? 'Скрыть окно' : 'Показать окно',
        click: toggleWindow
      },
      { type: 'separator' },
      { label: 'Выйти', click: () => { app.quit(); } }
    ]);
    tray.setContextMenu(menu);
  };

  tray.on('click', toggleWindow);
  tray.on('right-click', updateMenu);
  updateMenu();
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ======================== APP ========================
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('allow-http-screen-capture');
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns,WinRetrieveSuggestionsOnlyOnDemand');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100');

app.whenReady().then(() => {
  // Разрешаем захват экрана
  const { session, desktopCapturer } = require('electron');

  // Отключаем стандартный обработчик — используем getUserMedia с chromeMediaSource
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    callback({});
  });

  ipcMain.handle('get-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 },
      });
      return sources.map(s => ({
        id: s.id,
        name: s.name,
        thumbnail: ''
      }));
    } catch(e) {
      console.error('getSources error:', e.message);
      return [];
    }
  });
  ipcMain.handle('save-recording', async (event, { buffer, format }) => {
    const formats = {
      mp4: { name: 'MP4 Video', ext: 'mp4' },
      mkv: { name: 'MKV Video', ext: 'mkv' },
      webm: { name: 'WebM Video', ext: 'webm' },
      mp3: { name: 'MP3 Audio', ext: 'mp3' },
      wav: { name: 'WAV Audio', ext: 'wav' },
    };
    const fmt = formats[format] || formats.mp4;

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `запись-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.${fmt.ext}`,
      filters: [{ name: fmt.name, extensions: [fmt.ext] }, { name: 'Все файлы', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };

    const savePath = result.filePath;
    const data = Buffer.from(buffer);

    if (format === 'webm') {
      fs.writeFileSync(savePath, data);
      return { success: true, path: savePath };
    }

    const tempPath = path.join(os.tmpdir(), `lanvoice-${Date.now()}.webm`);
    fs.writeFileSync(tempPath, data);

    let ffmpegPath;
    try { ffmpegPath = require('ffmpeg-static'); } catch(e) {
      fs.unlinkSync(tempPath);
      return { success: false, error: 'ffmpeg-static не найден' };
    }

    const args = ['-y', '-i', tempPath];
    if (format === 'mp3') {
      args.push('-vn', '-acodec', 'libmp3lame', '-q:a', '2');
    } else if (format === 'wav') {
      args.push('-vn', '-acodec', 'pcm_s16le', '-ar', '44100');
    } else {
      args.push('-vcodec', 'libx264', '-preset', 'fast', '-crf', '23', '-acodec', 'aac');
    }
    args.push(savePath);

    return new Promise((resolve) => {
      const proc = execFile(ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', d => {
        stderr += d;
        const m = stderr.match(/time=(\d+:\d+:\d+)/g);
        if (m) event.sender.send('recording-progress', { time: m[m.length - 1].replace('time=', '') });
      });
      proc.on('close', (code) => {
        try { fs.unlinkSync(tempPath); } catch {}
        if (code === 0) resolve({ success: true, path: savePath });
        else resolve({ success: false, error: 'FFmpeg завершился с ошибкой ' + code });
      });
    });
  });

  startServer();
  createWindow();
  createTray();

  // Если сервер не поднялся за 5 сек — пробуем грузить
  setTimeout(() => {
    if (!serverReady && mainWindow) {
      mainWindow.webContents.loadURL('https://localhost:3000');
    }
  }, 5000);
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});

app.on('window-all-closed', (e) => {
  // Не выходим при закрытии окна — остаёмся в трее
});

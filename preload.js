const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  discoverServer: () => ipcRenderer.invoke('discover-server'),
  getSources: () => ipcRenderer.invoke('get-sources'),
  saveRecording: (buffer, format) => ipcRenderer.invoke('save-recording', { buffer, format }),
  onRecordingProgress: (cb) => ipcRenderer.on('recording-progress', (_, data) => cb(data)),
});

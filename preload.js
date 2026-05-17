const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  discoverServer: () => ipcRenderer.invoke('discover-server'),
  getSources: () => ipcRenderer.invoke('get-sources')
});

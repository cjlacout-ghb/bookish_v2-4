const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC communication here if needed in the future
  platform: process.platform,
  isElectron: true
});

console.log('Bookish Preload Script Loaded');

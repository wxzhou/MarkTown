const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  saveTheme: (theme) => ipcRenderer.invoke('save-theme', theme),
  onSetTheme: (callback) => ipcRenderer.on('set-theme', (event, theme) => callback(theme)),
  
  // 添加菜单事件监听器
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuSaveFile: (callback) => ipcRenderer.on('menu-save-file', callback),
});
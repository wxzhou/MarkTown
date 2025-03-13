const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 打开文件
  openFile: () => ipcRenderer.invoke('open-file'),
  
  // 保存文件
  saveFile: (content, currentFilePath) => ipcRenderer.invoke('save-file', content, currentFilePath),
  
  // 另存为
  saveFileAs: (content) => ipcRenderer.invoke('save-file-as', content),
  
  // 保存主题设置
  saveTheme: (theme) => ipcRenderer.send('save-theme', theme),
  
  // 获取保存的主题
  getTheme: () => ipcRenderer.invoke('get-theme'),
  
  // 监听主题设置
  onSetTheme: (callback) => ipcRenderer.on('set-theme', (_, theme) => callback(theme)),
  
  // 监听菜单事件
  onMenuNewFile: (callback) => ipcRenderer.on('menu-new-file', () => callback()),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', () => callback()),
  onMenuSaveFile: (callback) => ipcRenderer.on('menu-save-file', () => callback()),
  onMenuSaveAsFile: (callback) => ipcRenderer.on('menu-save-as-file', () => callback())
});
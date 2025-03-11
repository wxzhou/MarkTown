// 将任何 import 语句替换为 require
// 例如：将 import { app, BrowserWindow } from 'electron'; 
// 替换为：
// 确保引入了 Menu 模块
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// 创建 store 实例
const store = new Store();

// 声明一个全局变量来存储主窗口引用
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 加载index.html
  mainWindow.loadFile('index.html');
  
  // 开发时可以打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 创建应用菜单，添加快捷键
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-open-file');
            }
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-save-file');
            }
          }
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'delete', label: '删除' },
        { role: 'selectAll', label: '全选' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  
  // 恢复上次的主题设置
  const lastTheme = store.get('theme', 'github-light');
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-theme', lastTheme);
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 打开文件
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] }
    ]
  });
  
  if (!canceled && filePaths.length > 0) {
    currentFilePath = filePaths[0];
    try {
      const content = fs.readFileSync(currentFilePath, 'utf8');
      return { filePath: currentFilePath, content };
    } catch (err) {
      console.error('读取文件失败:', err);
      return { error: '读取文件失败' };
    }
  }
  
  return { canceled: true };
});

// 保存文件
ipcMain.handle('save-file', async (event, content) => {
  if (!currentFilePath) {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown'] }
      ]
    });
    
    if (canceled) return { canceled: true };
    currentFilePath = filePath;
  }
  
  try {
    fs.writeFileSync(currentFilePath, content, 'utf8');
    return { success: true, filePath: currentFilePath };
  } catch (err) {
    console.error('保存文件失败:', err);
    return { error: '保存文件失败' };
  }
});

// 保存主题设置
ipcMain.handle('save-theme', async (event, theme) => {
  store.set('theme', theme);
  return { success: true };
});

// 确保没有使用 export default 或 export const
// 使用 module.exports 代替
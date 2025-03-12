const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// 创建配置存储
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // 创建应用菜单
  createApplicationMenu();
}

// 创建应用菜单
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // 应用菜单（仅在macOS上显示）
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    
    // 文件菜单
    {
      label: '文件',
      submenu: [
        {
          label: '打开',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-file');
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-file');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    
    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    
    // 风格菜单
    {
      label: '风格',
      submenu: [
        {
          label: 'GitHub Light',
          type: 'radio',
          checked: store.get('theme') === 'github-light',
          click: () => {
            mainWindow.webContents.send('set-theme', 'github-light');
          }
        },
        {
          label: 'GitHub Dark',
          type: 'radio',
          checked: store.get('theme') === 'github-dark',
          click: () => {
            mainWindow.webContents.send('set-theme', 'github-dark');
          }
        },
        {
          label: 'Solarized Light',
          type: 'radio',
          checked: store.get('theme') === 'solarized-light',
          click: () => {
            mainWindow.webContents.send('set-theme', 'solarized-light');
          }
        },
        {
          label: 'Solarized Dark',
          type: 'radio',
          checked: store.get('theme') === 'solarized-dark',
          click: () => {
            mainWindow.webContents.send('set-theme', 'solarized-dark');
          }
        },
        {
          label: 'Dracula',
          type: 'radio',
          checked: store.get('theme') === 'dracula',
          click: () => {
            mainWindow.webContents.send('set-theme', 'dracula');
          }
        }
      ]
    },
    
    // 开发者菜单（仅在开发模式下显示）
    {
      label: '开发',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: '重置设置',
          click: () => {
            store.clear();
            mainWindow.webContents.reload();
          }
        }
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
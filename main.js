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
  
  // 每次启动应用时重置当前文件路径
  store.delete('currentFilePath');
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
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-file');
          }
        },
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
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-save-as-file');
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

// 处理打开文件请求
ipcMain.handle('open-file', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '打开文件',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (canceled || filePaths.length === 0) {
      return { canceled: true };
    }
    
    const filePath = filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    
    return { canceled: false, filePath, content };
  } catch (error) {
    console.error('打开文件时出错:', error);
    return { canceled: false, error: error.message };
  }
});

// 处理保存文件请求
ipcMain.handle('save-file', async (event, content, currentFilePath) => {
  try {
    // 如果没有当前文件路径，则弹出保存对话框
    if (!currentFilePath) {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: '保存文件',
        defaultPath: path.join(app.getPath('documents'), 'untitled.md'),
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      
      if (canceled) {
        return { success: false, canceled: true };
      }
      
      // 保存文件
      fs.writeFileSync(filePath, content, 'utf8');
      
      return { success: true, filePath };
    } else {
      // 有当前文件路径，直接保存
      fs.writeFileSync(currentFilePath, content, 'utf8');
      return { success: true, filePath: currentFilePath };
    }
  } catch (error) {
    console.error('保存文件时出错:', error);
    return { success: false, error: error.message };
  }
});

// 处理另存为请求
ipcMain.handle('save-file-as', async (event, content) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '另存为',
      defaultPath: path.join(app.getPath('documents'), 'untitled.md'),
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (canceled) {
      return { success: false, canceled: true };
    }
    
    // 保存文件
    fs.writeFileSync(filePath, content, 'utf8');
    
    return { success: true, filePath };
  } catch (error) {
    console.error('另存为时出错:', error);
    return { success: false, error: error.message };
  }
});

// 保存主题设置
ipcMain.on('save-theme', (event, theme) => {
  store.set('theme', theme);
});

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const distIcon = path.join(__dirname, '../dist/favicon.png');
  const publicIcon = path.join(__dirname, '../public/favicon.png');
  const iconPath = fs.existsSync(distIcon) ? distIcon : publicIcon;

  const win = new BrowserWindow({
    width: 1080,
    height: 840,
    minWidth: 420,
    minHeight: 600,
    title: '猫步可爱 - 极简高能个人助理',
    icon: iconPath,
    frame: true,
    titleBarStyle: 'hiddenInset', // Apple macOS native style
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // If in development mode, load localhost, otherwise load dist/index.html
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

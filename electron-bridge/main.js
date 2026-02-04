const { app, BrowserWindow } = require('electron');
const path = require('path');
const FingerprintBridge = require('./fingerprint');

let mainWindow;
let fingerprintBridge;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  fingerprintBridge = new FingerprintBridge(8081);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (fingerprintBridge) {
    fingerprintBridge.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

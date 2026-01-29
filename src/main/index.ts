import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  globalShortcut,
  Tray,
  Notification,
  type MenuItemConstructorOptions,
} from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { registerAllIPCHandlers, initializeEventEmitter } from './ipc';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

/**
 * Ensure single instance of the application
 */
const primaryInstance = app.requestSingleInstanceLock();

if (!primaryInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Create the browser window for the Lumos application
 * AC-1.2.1.2: BrowserWindow configuration with security best practices
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
    },
    icon: path.join(__dirname, '../../public/icon.png'),
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();

    // Initialize IPC event emitter
    if (mainWindow) {
      initializeEventEmitter(mainWindow);
      console.log('[IPC] Event emitter initialized');
    }
  });

  // AC-1.2.1.3: Application lifecycle handlers
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation to external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Security: prevent navigation to untrusted content
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== 'http://localhost:5173' && !isDev) {
      event.preventDefault();
    }
  });
}

/**
 * AC-1.2.1.3: Application lifecycle handlers
 * AC-1.2.3.5: IPC handler registration in main process
 */
app.on('ready', () => {
  // Register IPC handlers before creating window
  registerAllIPCHandlers();

  createWindow();
  setupMenu();
  registerGlobalShortcuts();
  setupSystemTray();
  checkForUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * AC-1.2.1.5: Global keyboard shortcuts registered
 */
function registerGlobalShortcuts() {
  // Window toggle: Cmd+Shift+L
  globalShortcut.register('CmdOrCtrl+Shift+L', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // New chat: Cmd+N
  globalShortcut.register('CmdOrCtrl+N', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.webContents.send('new-chat');
    }
  });

  // Command palette: Cmd+K
  globalShortcut.register('CmdOrCtrl+K', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.webContents.send('command-palette');
    }
  });

  // Focus window if it's hidden
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}

/**
 * AC-1.2.1.4: Menu bar and system tray integration
 */
function setupMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Lumos',
      submenu: [
        { label: 'About Lumos', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences', accelerator: 'CmdOrCtrl+,', click: () => goToSettings() },
        { type: 'separator' },
        { label: 'Hide Lumos', role: 'hide', accelerator: 'CmdOrCtrl+H' },
        { label: 'Hide Others', role: 'hideOthers', accelerator: 'CmdOrCtrl+Alt+H' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit Lumos', role: 'quit', accelerator: 'CmdOrCtrl+Q' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/lumenlab/lumos');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * AC-1.2.1.4: System tray integration
 */
function setupSystemTray() {
  const iconPath = path.join(__dirname, '../../public/icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'New Chat',
      click: () => {
        if (mainWindow && mainWindow.isVisible()) {
          mainWindow.webContents.send('new-chat');
        }
      },
    },
    {
      label: 'Preferences',
      click: () => goToSettings(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click on tray icon to show/hide window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

/**
 * AC-1.2.1.6: Auto-updater configured for macOS
 */
function checkForUpdates() {
  if (process.platform === 'darwin' && !isDev) {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      if (mainWindow) {
        new Notification({
          title: 'Lumos Update Available',
          body: 'A new version of Lumos is available. It will be installed when you restart.',
        }).show();
      }
    });

    autoUpdater.on('update-downloaded', () => {
      autoUpdater.quitAndInstall();
    });
  }
}

/**
 * Helper function to navigate to settings
 */
function goToSettings() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('navigate-to', '/settings');
  }
}

/**
 * IPC handlers for renderer process communication
 */
ipcMain.handle('get-app-version', () => {
  return { version: app.getVersion() };
});

ipcMain.on('app-version', (event) => {
  event.reply('app-version', { version: app.getVersion() });
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.on('error-log', (_event, errorData) => {
  console.error('Frontend Error:', JSON.stringify(errorData, null, 2));
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

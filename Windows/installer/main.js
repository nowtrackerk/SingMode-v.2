const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    const mainWindow = new BrowserWindow({
        width: width,
        height: height,
        title: "SingMode Command",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#020617',
        icon: path.join(__dirname, 'icon.ico') // Will use default if missing
    });

    // Check if we are in development or production
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Remove menu bar for cleaner look (can press Alt to show)
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

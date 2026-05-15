const { app, BrowserWindow, protocol, net, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let loadingWindow;
let pythonProcess = null;

// 1. Register Custom Protocol (app://)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true
    }
  }
]);

function getCoversPath() {
  const documents = app.getPath('documents');
  return path.join(documents, 'Bookish', 'data', 'portadas');
}

function getCapturasPath() {
  const documents = app.getPath('documents');
  return path.join(documents, 'Bookish', 'data', 'capturas');
}

function startBackend() {
  const isDev = !app.isPackaged;
  const port = '8000';
  
  let pythonExe;
  let args;

  if (isDev) {
    pythonExe = 'python';
    args = [path.join(__dirname, '..', 'backend', 'main.py'), port];
  } else {
    // Mode: --onedir structure
    pythonExe = path.join(process.resourcesPath, 'backend_dist', 'bookish_backend.exe');
    args = [port];
  }

  console.log(`Starting backend: ${pythonExe} ${args.join(' ')}`);

  pythonProcess = spawn(pythonExe, args, {
    stdio: 'pipe',
    shell: true
  });

  pythonProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
  pythonProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
  pythonProcess.on('close', (code) => console.log(`Backend process exited with code ${code}`));
}

function showLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const loadingHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          background: #0d0d0d;
          color: #c9a84c;
          font-family: 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          overflow: hidden;
          border: 1px solid #c9a84c;
        }
        h1 {
          font-size: 3rem;
          margin: 0;
          letter-spacing: 0.5rem;
          font-weight: 300;
        }
        p {
          color: #9a8040;
          margin-top: 10px;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.2rem;
        }
        .dots {
          display: flex;
          gap: 5px;
          margin-top: 20px;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #c9a84c;
          border-radius: 50%;
          animation: pulse 1.5s infinite ease-in-out;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      </style>
    </head>
    <body>
      <h1>BOOKISH</h1>
      <p>Iniciando el archivo...</p>
      <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </body>
    </html>
  `;

  loadingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
}

async function waitForBackend() {
  const maxAttempts = 60; // 60 * 500ms = 30s
  const healthUrl = 'http://localhost:8000/api/health';
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await net.fetch(healthUrl);
      if (response.status === 200) {
        console.log('Backend is ready!');
        return true;
      }
    } catch (e) {
      // Ignore connection errors
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Backend failed to start within 30 seconds');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend_dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open links in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Destroy loading window when main window is ready to show
  mainWindow.once('ready-to-show', () => {
    if (loadingWindow) {
      loadingWindow.destroy();
      loadingWindow = null;
    }
    mainWindow.show();
  });
}

app.whenReady().then(async () => {
  // 2. Handle Custom Protocol (app://)
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath;

    if (url.hostname === 'covers') {
      const filename = url.pathname.replace(/^\//, '');
      filePath = path.join(getCoversPath(), filename);
    } else if (url.hostname === 'capturas') {
      const filename = url.pathname.replace(/^\//, '');
      filePath = path.join(getCapturasPath(), filename);
    } else {
      return new Response('Not found', { status: 404 });
    }

    const normalizedPath = filePath.split(path.sep).join('/');
    return net.fetch(`file:///${normalizedPath}`);
  });

  showLoadingWindow();
  startBackend();
  
  try {
    await waitForBackend();
    createWindow();
  } catch (error) {
    console.error(error);
    dialog.showErrorBox(
      'Bookish — Error de inicio',
      'El servidor no pudo iniciarse en 30 segundos.\n\n' +
      'Intentá abrir la aplicación nuevamente.\n' +
      'Si el problema persiste, reiniciá tu computadora.'
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (pythonProcess) {
      spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
    }
    app.quit();
  }
});

app.on('quit', () => {
  if (pythonProcess) {
    spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']);
  }
});

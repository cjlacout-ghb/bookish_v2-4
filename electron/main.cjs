const { app, BrowserWindow, protocol, net, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

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

function getCoversPath(dataPath) {
  return path.join(dataPath, 'portadas');
}

function getCapturasPath(dataPath) {
  return path.join(dataPath, 'capturas');
}

function startBackend() {
  const isDev = !app.isPackaged;
  const port = '8000';
  const dataPath = path.join(app.getPath('documents'), 'Bookish', 'data');

  // --- Log file en Documentos\Bookish\backend.log ---
  const bookishDir = path.join(app.getPath('documents'), 'Bookish');
  if (!fs.existsSync(bookishDir)) fs.mkdirSync(bookishDir, { recursive: true });
  const logPath = path.join(bookishDir, 'backend.log');
  const logStream = fs.openSync(logPath, 'a');
  
  const logLine = (msg) => fs.writeSync(logStream, `[${new Date().toISOString()}] ${msg}\n`);
  logLine('=== Bookish backend startup ===');

  let pythonExe;
  let args;

  if (isDev) {
    pythonExe = 'python';
    args = [path.join(__dirname, '..', 'backend', 'main.py'), port, dataPath];
  } else {
    pythonExe = path.join(process.resourcesPath, 'backend_dist', 'bookish_backend.exe');
    args = [port, dataPath];
  }

  logLine(`pythonExe: ${pythonExe}`);
  logLine(`args: ${args.join(' ')}`);
  logLine(`resourcesPath: ${process.resourcesPath}`);
  console.log(`Starting backend: ${pythonExe} ${args.join(' ')}`);

  // Verificar que el ejecutable existe
  if (!isDev && !fs.existsSync(pythonExe)) {
    const msg = `BACKEND NO ENCONTRADO: ${pythonExe}`;
    console.error(msg);
    logLine(`ERROR: ${msg}`);
  }

  pythonProcess = spawn(pythonExe, args, {
    stdio: ['ignore', logStream, logStream],
    shell: true,
    windowsHide: true
  });

  pythonProcess.on('close', (code) => {
    const msg = `Backend process exited with code ${code}`;
    console.log(msg);
    logLine(msg);
  });
  pythonProcess.on('error', (err) => {
    const msg = `Backend spawn error: ${err.message}`;
    console.error(msg);
    logLine(`ERROR: ${msg}`);
  });
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
  const logPath = path.join(app.getPath('documents'), 'Bookish', 'backend.log');
  const logLine = (msg) => {
    try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); } catch(_) {}
  };

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await net.fetch(healthUrl);
      if (response.status === 200) {
        const msg = `Backend listo en intento ${i + 1}`;
        console.log(msg);
        logLine(msg);
        return true;
      }
    } catch (e) {
      const msg = `Intento ${i + 1}/60 - backend no responde (${e.message})`;
      console.log(msg);
      logLine(msg);
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

    const dataPath = path.join(app.getPath('documents'), 'Bookish', 'data');

    if (url.hostname === 'covers') {
      const filename = url.pathname.replace(/^\//, '');
      filePath = path.join(getCoversPath(dataPath), filename);
    } else if (url.hostname === 'capturas') {
      const filename = url.pathname.replace(/^\//, '');
      filePath = path.join(getCapturasPath(dataPath), filename);
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
      'El motor de datos no pudo iniciarse en 30 segundos.\n\n' +
      'Causas posibles:\n' +
      '1. Un antivirus está bloqueando el archivo "bookish_backend.exe".\n' +
      '2. Ya hay otra instancia de Bookish abierta.\n' +
      '3. El puerto 8000 está siendo usado por otra aplicación.\n\n' +
      'Solución: Intentá cerrar la app, verificar tu antivirus y abrirla nuevamente.'
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

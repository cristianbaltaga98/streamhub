import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { startServer } from './server'
import { destroyClient } from './torrent'

process.on('uncaughtException', (e) => console.error('[uncaught]', e?.message || e))
process.on('unhandledRejection', (e: any) => console.error('[unhandled]', e?.message || e))

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d0f14',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await startServer({ host: '127.0.0.1' })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await destroyClient()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  await destroyClient()
})

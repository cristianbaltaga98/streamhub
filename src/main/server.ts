import express from 'express'
import cors from 'cors'
import { exec } from 'child_process'
import { loadConfig, saveConfig } from './config'
import { search, categoryIdsFor } from './indexers'
import { addTorrent, streamFile, torrentProgress } from './torrent'
import { getMeta } from './metadata'

export const SERVER_PORT = 6868

export function startServer(): Promise<void> {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.get('/api/config', (_req, res) => {
    const cfg = loadConfig()
    res.json({
      ...cfg,
      prowlarrApiKey: cfg.prowlarrApiKey ? '********' : '',
      jackettApiKey: cfg.jackettApiKey ? '********' : '',
      tmdbApiKey: cfg.tmdbApiKey ? '********' : ''
    })
  })

  app.post('/api/config', (req, res) => {
    const patch = { ...req.body }
    if (patch.prowlarrApiKey === '********') delete patch.prowlarrApiKey
    if (patch.jackettApiKey === '********') delete patch.jackettApiKey
    if (patch.tmdbApiKey === '********') delete patch.tmdbApiKey
    saveConfig(patch)
    res.json({ ok: true })
  })

  app.get('/api/search', async (req, res) => {
    try {
      const cfg = loadConfig()
      const query = String(req.query.q || '')
      const kind = String(req.query.category || 'all')
      if (!query) return res.status(400).json({ error: 'Missing query' })
      const results = await search(cfg, { query, categories: categoryIdsFor(kind) })
      res.json({ results })
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  })

  app.get('/api/meta', async (req, res) => {
    try {
      const title = String(req.query.title || '')
      const year = req.query.year ? String(req.query.year) : undefined
      const type = req.query.type === 'tv' ? 'tv' : req.query.type === 'movie' ? 'movie' : undefined
      if (!title) return res.json({ poster: null })
      res.json(await getMeta(loadConfig(), title, year, type))
    } catch {
      res.json({ poster: null })
    }
  })

  app.post('/api/torrents', async (req, res) => {
    try {
      const source = req.body.magnet || req.body.downloadUrl
      if (!source) return res.status(400).json({ error: 'Missing magnet or downloadUrl' })
      const added = await addTorrent(source)
      res.json(added)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  })

  app.get('/api/progress/:infoHash', async (req, res) => {
    res.json(await torrentProgress(req.params.infoHash))
  })

  app.get('/api/stream/:infoHash/:fileIndex', async (req, res) => {
    try {
      await streamFile(req.params.infoHash, parseInt(req.params.fileIndex, 10), req, res)
    } catch (e: any) {
      if (!res.headersSent) res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/open-external', (req, res) => {
    const { app: target, url } = req.body as { app: 'vlc' | 'infuse'; url: string }
    if (!url) return res.status(400).json({ error: 'Missing url' })
    let cmd: string
    if (target === 'infuse') {
      cmd = `open "infuse://x-callback-url/play?url=${encodeURIComponent(url)}"`
    } else {
      cmd = `open -a VLC "${url}"`
    }
    exec(cmd, (err) => {
      if (err) return res.status(500).json({ error: err.message })
      res.json({ ok: true })
    })
  })

  return new Promise((resolve) => {
    app.listen(SERVER_PORT, '127.0.0.1', () => resolve())
  })
}

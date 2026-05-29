import type { Request, Response } from 'express'

let clientPromise: Promise<any> | null = null
const sourceToHash = new Map<string, string>()

const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.theoks.net:6969/announce',
  'udp://tracker.qu.ax:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.publictracker.xyz:6969/announce',
  'udp://tracker-udp.gbitt.info:80/announce',
  'https://tracker.zhuqiy.com:443/announce',
  'http://www.torrentsnipe.info:2701/announce'
]

async function getClient(): Promise<any> {
  if (!clientPromise) {
    clientPromise = import('webtorrent').then((m) => {
      const WebTorrent = (m as any).default || m
      const client = new WebTorrent()
      client.on('error', (e: any) => console.error('[webtorrent]', e?.message || e))
      return client
    })
  }
  return clientPromise
}

async function infoHashOf(resolved: string | Buffer): Promise<string | null> {
  try {
    const parseTorrent = (await import('parse-torrent')).default as any
    const parsed = await parseTorrent(resolved)
    return parsed?.infoHash || null
  } catch {
    return null
  }
}

const STREAMABLE = /\.(mp4|m4v|webm|ogg|ogv)$/i
const VIDEO = /\.(mp4|m4v|mkv|webm|avi|mov|wmv|flv|ts|m2ts)$/i
const SUBTITLE = /\.(srt|vtt|ass|ssa|sub)$/i

export interface TorrentFileInfo {
  index: number
  name: string
  path: string
  length: number
  isVideo: boolean
  isSubtitle: boolean
  browserPlayable: boolean
}

export interface AddedTorrent {
  infoHash: string
  name: string
  files: TorrentFileInfo[]
}

function withTrackers(magnet: string): string {
  const extra = TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join('')
  return magnet + extra
}

async function resolveSource(source: string): Promise<string | Buffer> {
  if (source.startsWith('magnet:')) return withTrackers(source)

  let url = source
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { redirect: 'manual' })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location') || ''
      if (loc.startsWith('magnet:')) return withTrackers(loc)
      url = new URL(loc, url).toString()
      continue
    }
    if (!res.ok) throw new Error(`Indexer returned ${res.status} for the download link`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.slice(0, 20).toString('utf8').startsWith('magnet:')) return withTrackers(buf.toString('utf8').trim())
    return buf
  }
  throw new Error('Too many redirects resolving the download link')
}

export async function addTorrent(source: string): Promise<AddedTorrent> {
  const client = await getClient()

  const cachedHash = sourceToHash.get(source)
  const resolved = await resolveSource(source)
  const hash = cachedHash || (await infoHashOf(resolved))
  const existing = hash ? client.torrents.find((t: any) => t.infoHash === hash) : null

  const torrent =
    existing ||
    (await new Promise<any>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('Could not load this torrent (metadata fetch failed).')), 40000)
      try {
        const t = client.add(resolved as any, { announce: TRACKERS }, () => {
          clearTimeout(to)
          resolve(t)
        })
        t.on('error', (e: any) => {
          clearTimeout(to)
          reject(new Error(e?.message || 'Torrent error'))
        })
      } catch (e) {
        clearTimeout(to)
        reject(e)
      }
    }))

  if (!torrent.files || !torrent.files.length) {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('Timed out waiting for torrent metadata.')), 40000)
      torrent.once('metadata', () => {
        clearTimeout(to)
        resolve()
      })
    })
  }

  sourceToHash.set(source, torrent.infoHash)
  torrent.deselect(0, torrent.pieces.length - 1, false)
  torrent.files.forEach((f: any) => f.deselect())

  return {
    infoHash: torrent.infoHash,
    name: torrent.name,
    files: torrent.files.map((f: any, i: number) => ({
      index: i,
      name: f.name,
      path: f.path,
      length: f.length,
      isVideo: VIDEO.test(f.name),
      isSubtitle: SUBTITLE.test(f.name),
      browserPlayable: STREAMABLE.test(f.name)
    }))
  }
}

export async function torrentProgress(infoHash: string): Promise<any> {
  const client = await getClient()
  const torrent = client.torrents.find((t: any) => t.infoHash === infoHash)
  if (!torrent) return { found: false }
  return {
    found: true,
    numPeers: torrent.numPeers,
    progress: torrent.progress,
    downloadSpeed: torrent.downloadSpeed,
    ready: torrent.ready
  }
}

export async function streamFile(infoHash: string, fileIndex: number, req: Request, res: Response): Promise<void> {
  const client = await getClient()
  const torrent = client.torrents.find((t: any) => t.infoHash === infoHash)
  if (!torrent) {
    res.status(404).end('Torrent not active')
    return
  }
  const file = torrent.files[fileIndex]
  if (!file) {
    res.status(404).end('File not found')
    return
  }
  file.select()

  const total = file.length
  const range = req.headers.range

  if (!range) {
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'application/octet-stream', 'Accept-Ranges': 'bytes' })
    file.createReadStream().pipe(res)
    return
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range)
  const start = match && match[1] ? parseInt(match[1], 10) : 0
  const end = match && match[2] ? parseInt(match[2], 10) : total - 1

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${total}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': 'application/octet-stream'
  })

  const stream = file.createReadStream({ start, end })
  stream.pipe(res)
  req.on('close', () => stream.destroy())
}

export async function destroyClient(): Promise<void> {
  if (clientPromise) {
    const client = await clientPromise
    await new Promise<void>((resolve) => client.destroy(() => resolve()))
    clientPromise = null
  }
}

import type { Request, Response } from 'express'

let clientPromise: Promise<any> | null = null

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
      return new WebTorrent()
    })
  }
  return clientPromise
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

function withTrackers(source: string): string {
  if (source.startsWith('magnet:')) {
    const extra = TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join('')
    return source + extra
  }
  return source
}

export async function addTorrent(source: string): Promise<AddedTorrent> {
  const client = await getClient()

  const existing = (await client.get(source)) || client.torrents.find((t: any) => source.includes(t.infoHash))
  const torrent =
    existing ||
    (await new Promise<any>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('Could not find peers for this torrent (likely too few seeders).')), 40000)
      try {
        client.add(withTrackers(source), { announce: TRACKERS }, (t: any) => {
          clearTimeout(to)
          resolve(t)
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
  const torrent = client.get(infoHash) || client.torrents.find((t: any) => t.infoHash === infoHash)
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
  const torrent = client.get(infoHash) || client.torrents.find((t: any) => t.infoHash === infoHash)
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

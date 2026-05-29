import type { ParsedRelease } from '@shared/parse'

const BASE = (window as any).streamhub?.apiBase || 'http://127.0.0.1:6868'

export interface Meta {
  poster: string | null
  backdrop: string | null
  title: string | null
  year: string | null
  rating: number | null
  overview: string | null
}

const EMPTY_META: Meta = { poster: null, backdrop: null, title: null, year: null, rating: null, overview: null }
const metaCache = new Map<string, Meta>()

export interface SearchResult {
  title: string
  indexer: string
  size: number
  seeders: number
  leechers: number
  magnetUrl: string | null
  downloadUrl: string | null
  infoHash: string | null
  publishDate: string | null
  categories: string[]
  parsed: ParsedRelease
}

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

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export const api = {
  base: BASE,

  async search(q: string, category: string): Promise<SearchResult[]> {
    const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}&category=${category}`)
    const data = await json<{ results: SearchResult[] }>(res)
    return data.results
  },

  async addTorrent(r: SearchResult): Promise<AddedTorrent> {
    const res = await fetch(`${BASE}/api/torrents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magnet: r.magnetUrl, downloadUrl: r.downloadUrl })
    })
    return json<AddedTorrent>(res)
  },

  streamUrl(infoHash: string, fileIndex: number): string {
    return `${BASE}/api/stream/${infoHash}/${fileIndex}`
  },

  async openExternal(target: 'vlc' | 'infuse', url: string): Promise<void> {
    await fetch(`${BASE}/api/open-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: target, url })
    })
  },

  async getMeta(title: string, year: string | null, type: string): Promise<Meta> {
    const k = `${title}|${year}|${type}`
    if (metaCache.has(k)) return metaCache.get(k)!
    try {
      const q = `title=${encodeURIComponent(title)}&type=${type}${year ? `&year=${year}` : ''}`
      const res = await fetch(`${BASE}/api/meta?${q}`)
      const data = await res.json()
      metaCache.set(k, data)
      return data
    } catch {
      return EMPTY_META
    }
  },

  async getProgress(infoHash: string): Promise<any> {
    try {
      return await (await fetch(`${BASE}/api/progress/${infoHash}`)).json()
    } catch {
      return { found: false }
    }
  },

  async getConfig(): Promise<any> {
    return json(await fetch(`${BASE}/api/config`))
  },

  async saveConfig(patch: any): Promise<void> {
    await fetch(`${BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
  }
}

export function formatBytes(n: number): string {
  if (!n) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

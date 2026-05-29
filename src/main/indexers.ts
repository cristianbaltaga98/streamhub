import { parseTitle } from '../shared/parse'
import type { AppConfig } from './config'

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
  parsed: ReturnType<typeof parseTitle>
}

export interface SearchOptions {
  query: string
  categories?: number[]
  limit?: number
}

const CATEGORY_MAP: Record<string, number[]> = {
  movies: [2000],
  tv: [5000],
  anime: [5070, 100001],
  all: []
}

export function categoryIdsFor(kind: string): number[] {
  return CATEGORY_MAP[kind] ?? []
}

async function searchProwlarr(cfg: AppConfig, opts: SearchOptions): Promise<SearchResult[]> {
  const url = new URL('/api/v1/search', cfg.prowlarrUrl)
  url.searchParams.set('query', opts.query)
  url.searchParams.set('type', 'search')
  url.searchParams.set('limit', String(opts.limit ?? 100))
  for (const c of opts.categories ?? []) url.searchParams.append('categories', String(c))

  const res = await fetch(url, { headers: { 'X-Api-Key': cfg.prowlarrApiKey } })
  if (!res.ok) throw new Error(`Prowlarr ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as any[]

  return data.map((r) => ({
    title: r.title,
    indexer: r.indexer,
    size: r.size ?? 0,
    seeders: r.seeders ?? 0,
    leechers: r.leechers ?? 0,
    magnetUrl: r.magnetUrl ?? null,
    downloadUrl: r.downloadUrl ?? r.guid ?? null,
    infoHash: r.infoHash ?? null,
    publishDate: r.publishDate ?? null,
    categories: (r.categories ?? []).map((c: any) => c.name ?? String(c.id)),
    parsed: parseTitle(r.title)
  }))
}

async function searchJackett(cfg: AppConfig, opts: SearchOptions): Promise<SearchResult[]> {
  const url = new URL('/api/v2.0/indexers/all/results', cfg.jackettUrl)
  url.searchParams.set('apikey', cfg.jackettApiKey)
  url.searchParams.set('Query', opts.query)
  for (const c of opts.categories ?? []) url.searchParams.append('Category[]', String(c))

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Jackett ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as any
  const rows: any[] = data.Results ?? []

  return rows.map((r) => ({
    title: r.Title,
    indexer: r.Tracker,
    size: r.Size ?? 0,
    seeders: r.Seeders ?? 0,
    leechers: r.Peers ?? 0,
    magnetUrl: r.MagnetUri ?? null,
    downloadUrl: r.Link ?? null,
    infoHash: r.InfoHash ?? null,
    publishDate: r.PublishDate ?? null,
    categories: r.CategoryDesc ? [r.CategoryDesc] : [],
    parsed: parseTitle(r.Title)
  }))
}

export async function search(cfg: AppConfig, opts: SearchOptions): Promise<SearchResult[]> {
  const results = cfg.backend === 'jackett' ? await searchJackett(cfg, opts) : await searchProwlarr(cfg, opts)
  return results.sort((a, b) => b.seeders - a.seeders)
}

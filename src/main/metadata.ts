import { cleanQuery } from '../shared/parse'
import type { AppConfig } from './config'

const cache = new Map<string, string | null>()

async function fromTmdb(apiKey: string, query: string, year: string | null): Promise<string | null> {
  const url = new URL('https://api.themoviedb.org/3/search/multi')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('query', query)
  if (year) url.searchParams.set('year', year)
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as any
  const hit = (data.results || []).find((r: any) => r.poster_path)
  return hit ? `https://image.tmdb.org/t/p/w185${hit.poster_path}` : null
}

async function fromItunes(query: string): Promise<string | null> {
  for (const media of ['movie', 'tvShow']) {
    const url = new URL('https://itunes.apple.com/search')
    url.searchParams.set('term', query)
    url.searchParams.set('media', media)
    url.searchParams.set('limit', '1')
    const res = await fetch(url)
    if (!res.ok) continue
    const data = (await res.json()) as any
    const art = data.results?.[0]?.artworkUrl100
    if (art) return art.replace(/100x100bb\.(jpg|png)/, '400x600bb.$1')
  }
  return null
}

export async function getPoster(cfg: AppConfig, rawTitle: string): Promise<string | null> {
  const { query, year } = cleanQuery(rawTitle)
  const key = `${query}|${year}`
  if (cache.has(key)) return cache.get(key)!

  let poster: string | null = null
  try {
    if (cfg.tmdbApiKey) poster = await fromTmdb(cfg.tmdbApiKey, query, year)
    if (!poster) poster = await fromItunes(query)
  } catch {
    poster = null
  }
  cache.set(key, poster)
  return poster
}

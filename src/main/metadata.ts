import { cleanQuery } from '../shared/parse'
import type { AppConfig } from './config'

const cache = new Map<string, string | null>()

export async function getPoster(cfg: AppConfig, rawTitle: string): Promise<string | null> {
  if (!cfg.tmdbApiKey) return null
  const { query, year } = cleanQuery(rawTitle)
  const key = `${query}|${year}`
  if (cache.has(key)) return cache.get(key)!

  const url = new URL('https://api.themoviedb.org/3/search/multi')
  url.searchParams.set('api_key', cfg.tmdbApiKey)
  url.searchParams.set('query', query)
  if (year) url.searchParams.set('year', year)

  try {
    const res = await fetch(url)
    if (!res.ok) {
      cache.set(key, null)
      return null
    }
    const data = (await res.json()) as any
    const hit = (data.results || []).find((r: any) => r.poster_path) || null
    const poster = hit ? `https://image.tmdb.org/t/p/w185${hit.poster_path}` : null
    cache.set(key, poster)
    return poster
  } catch {
    cache.set(key, null)
    return null
  }
}

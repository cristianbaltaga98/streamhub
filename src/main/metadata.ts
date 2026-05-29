import { cleanQuery } from '../shared/parse'
import type { AppConfig } from './config'

export interface Meta {
  poster: string | null
  backdrop: string | null
  title: string | null
  year: string | null
  rating: number | null
  overview: string | null
}

const cache = new Map<string, Meta>()
const EMPTY: Meta = { poster: null, backdrop: null, title: null, year: null, rating: null, overview: null }

async function fromTmdb(apiKey: string, query: string, year: string | null, type: 'movie' | 'tv'): Promise<Meta | null> {
  const endpoints = type === 'tv' ? ['tv', 'movie'] : ['movie', 'tv']
  for (const ep of endpoints) {
    const url = new URL(`https://api.themoviedb.org/3/search/${ep}`)
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('query', query)
    if (year) url.searchParams.set(ep === 'tv' ? 'first_air_date_year' : 'year', year)
    const res = await fetch(url)
    if (!res.ok) continue
    const data = (await res.json()) as any
    const hit = (data.results || []).sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))[0]
    if (hit) {
      const date = hit.release_date || hit.first_air_date || ''
      return {
        poster: hit.poster_path ? `https://image.tmdb.org/t/p/w342${hit.poster_path}` : null,
        backdrop: hit.backdrop_path ? `https://image.tmdb.org/t/p/w780${hit.backdrop_path}` : null,
        title: hit.title || hit.name || null,
        year: date ? date.slice(0, 4) : year,
        rating: hit.vote_average ? Math.round(hit.vote_average * 10) / 10 : null,
        overview: hit.overview || null
      }
    }
  }
  return null
}

async function fromItunes(query: string, type: 'movie' | 'tv'): Promise<Meta | null> {
  const media = type === 'tv' ? ['tvShow', 'movie'] : ['movie', 'tvShow']
  for (const m of media) {
    const url = new URL('https://itunes.apple.com/search')
    url.searchParams.set('term', query)
    url.searchParams.set('media', m)
    url.searchParams.set('limit', '1')
    const res = await fetch(url)
    if (!res.ok) continue
    const r = (await res.json()) as any
    const art = r.results?.[0]?.artworkUrl100
    if (art) {
      return {
        ...EMPTY,
        poster: art.replace(/100x100bb\.(jpg|png)/, '400x600bb.$1'),
        title: r.results[0].trackName || r.results[0].collectionName || null
      }
    }
  }
  return null
}

export async function getMeta(cfg: AppConfig, rawTitle: string, yearHint?: string, typeHint?: 'movie' | 'tv'): Promise<Meta> {
  const cleaned = cleanQuery(rawTitle)
  const query = cleaned.query
  const year = yearHint || cleaned.year
  const type = typeHint || cleaned.type
  const key = `${query}|${year}|${type}`
  if (cache.has(key)) return cache.get(key)!

  let meta: Meta | null = null
  try {
    if (cfg.tmdbApiKey) meta = await fromTmdb(cfg.tmdbApiKey, query, year, type)
    if (!meta) meta = await fromItunes(query, type)
  } catch {
    meta = null
  }
  const result = meta || EMPTY
  cache.set(key, result)
  return result
}

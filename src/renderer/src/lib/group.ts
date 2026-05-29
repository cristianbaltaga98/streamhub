import { cleanQuery } from '@shared/parse'
import type { SearchResult } from './api'

export interface MovieGroup {
  key: string
  title: string
  year: string | null
  type: 'movie' | 'tv'
  releases: SearchResult[]
  bestSeeders: number
  qualities: string[]
}

const QUALITY_ORDER = ['2160p', '1080p', '720p', '480p']

export function groupResults(results: SearchResult[]): MovieGroup[] {
  const map = new Map<string, MovieGroup>()

  for (const r of results) {
    const c = cleanQuery(r.title)
    let g = map.get(c.key)
    if (!g) {
      g = { key: c.key, title: c.query, year: c.year, type: c.type, releases: [], bestSeeders: 0, qualities: [] }
      map.set(c.key, g)
    }
    g.releases.push(r)
    g.bestSeeders = Math.max(g.bestSeeders, r.seeders)
    if (r.parsed.quality && !g.qualities.includes(r.parsed.quality)) g.qualities.push(r.parsed.quality)
    if (!g.year && c.year) g.year = c.year
  }

  const groups = [...map.values()]
  for (const g of groups) {
    g.releases.sort((a, b) => b.seeders - a.seeders)
    g.qualities.sort((a, b) => QUALITY_ORDER.indexOf(a) - QUALITY_ORDER.indexOf(b))
  }
  return groups.sort((a, b) => b.bestSeeders - a.bestSeeders)
}

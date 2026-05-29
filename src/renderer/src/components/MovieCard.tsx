import { useEffect, useState } from 'react'
import { api, Meta } from '../lib/api'
import type { MovieGroup } from '../lib/group'

interface Props {
  group: MovieGroup
  onOpen: (g: MovieGroup, meta: Meta | null) => void
}

export default function MovieCard({ group, onOpen }: Props): JSX.Element {
  const [meta, setMeta] = useState<Meta | null>(null)

  useEffect(() => {
    let alive = true
    api.getMeta(group.title, group.year, group.type).then((m) => alive && setMeta(m))
    return () => {
      alive = false
    }
  }, [group.key])

  const displayTitle = meta?.title || group.title
  const year = meta?.year || group.year

  return (
    <button className="card" onClick={() => onOpen(group, meta)}>
      <div className="card-poster">
        {meta?.poster ? <img src={meta.poster} alt={displayTitle} loading="lazy" /> : <div className="card-ph">🎬</div>}
        {group.type === 'tv' && <span className="card-typetag">SERIES</span>}
        {meta?.rating ? <span className="card-rating">★ {meta.rating}</span> : null}
        <span className="card-seed">▲ {group.bestSeeders}</span>
        <div className="card-quals">
          {group.qualities.slice(0, 3).map((q) => (
            <span key={q} className="card-qual">{q}</span>
          ))}
        </div>
      </div>
      <div className="card-meta">
        <span className="card-title">{displayTitle}</span>
        <span className="card-year">{year || ''} · {group.releases.length} source{group.releases.length > 1 ? 's' : ''}</span>
      </div>
    </button>
  )
}

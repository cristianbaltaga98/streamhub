import { SearchResult, formatBytes } from '../lib/api'
import Poster from './Poster'

interface Props {
  results: SearchResult[]
  onPlay: (r: SearchResult) => void
}

function badgeClass(badge: string): string {
  if (badge.startsWith('AUD:')) return 'badge aud'
  if (badge.startsWith('SUB:')) return 'badge sub'
  if (badge === 'DUAL' || badge === 'MULTI-SUB') return 'badge multi'
  return 'badge group'
}

export default function ResultsList({ results, onPlay }: Props): JSX.Element {
  if (results.length === 0) return <></>
  return (
    <table className="results">
      <thead>
        <tr>
          <th></th>
          <th>Title</th>
          <th>Tags</th>
          <th>Quality</th>
          <th>Size</th>
          <th>Seed</th>
          <th>Tracker</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => {
          const p = r.parsed
          const canStream = !!(r.magnetUrl || r.downloadUrl)
          return (
            <tr key={`${r.infoHash || r.title}-${i}`}>
              <td><Poster title={r.title} /></td>
              <td className="title-cell">
                <span className="title">{r.title}</span>
                {p.isAnime && <span className="badge anime">ANIME</span>}
              </td>
              <td>
                <div className="badges">
                  {p.badges.map((b) => (
                    <span key={b} className={badgeClass(b)}>{b.replace(/^(AUD|SUB):/, '')}</span>
                  ))}
                </div>
              </td>
              <td>
                <div className="quality">
                  {p.quality && <span>{p.quality}</span>}
                  {p.codec && <span className="dim">{p.codec}</span>}
                  {p.container && <span className="dim">{p.container}</span>}
                </div>
              </td>
              <td>{formatBytes(r.size)}</td>
              <td className={r.seeders > 0 ? 'seed-ok' : 'seed-bad'}>{r.seeders}</td>
              <td className="dim">{r.indexer}</td>
              <td>
                <button className="play-btn" disabled={!canStream} onClick={() => onPlay(r)}>
                  ▶ Play
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

import { SearchResult, Meta, formatBytes } from '../lib/api'
import type { MovieGroup } from '../lib/group'

interface Props {
  group: MovieGroup
  meta: Meta | null
  onClose: () => void
  onPlay: (r: SearchResult) => void
}

function badgeClass(badge: string): string {
  if (badge.startsWith('AUD:')) return 'badge aud'
  if (badge.startsWith('SUB:')) return 'badge sub'
  if (badge === 'DUAL' || badge === 'MULTI-SUB') return 'badge multi'
  return 'badge group'
}

export default function SourcesModal({ group, meta, onClose, onPlay }: Props): JSX.Element {
  const title = meta?.title || group.title
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal sources-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="sources-hero"
          style={meta?.backdrop ? { backgroundImage: `url(${meta.backdrop})` } : undefined}
        >
          <button className="icon-btn hero-close" onClick={onClose}>✕</button>
          <div className="hero-overlay">
            <h2>{title} {group.year ? <span className="hero-year">({group.year})</span> : null}</h2>
            {meta?.rating ? <div className="hero-rating">★ {meta.rating}</div> : null}
            {meta?.overview ? <p className="hero-overview">{meta.overview}</p> : null}
          </div>
        </div>

        <div className="sources-head">{group.releases.length} sources · sorted by seeders</div>
        <div className="sources-list">
          {group.releases.map((r, i) => {
            const canStream = !!(r.magnetUrl || r.downloadUrl)
            return (
              <div className="source-row" key={`${r.infoHash || r.title}-${i}`}>
                <div className="source-main">
                  <span className="source-title">{r.title}</span>
                  <div className="badges">
                    {r.parsed.quality && <span className="badge q">{r.parsed.quality}</span>}
                    {r.parsed.codec && <span className="badge group">{r.parsed.codec}</span>}
                    {r.parsed.badges.map((b) => (
                      <span key={b} className={badgeClass(b)}>{b.replace(/^(AUD|SUB):/, '')}</span>
                    ))}
                  </div>
                </div>
                <span className="source-size">{formatBytes(r.size)}</span>
                <span className={r.seeders > 0 ? 'seed-ok' : 'seed-bad'}>▲ {r.seeders}</span>
                <span className="dim source-tracker">{r.indexer}</span>
                <button className="play-btn" disabled={!canStream} onClick={() => onPlay(r)}>▶ Play</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

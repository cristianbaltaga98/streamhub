import { useEffect, useState } from 'react'
import { api, SearchResult, AddedTorrent, TorrentFileInfo, formatBytes } from '../lib/api'

interface Props {
  result: SearchResult
  onClose: () => void
}

export default function Player({ result, onClose }: Props): JSX.Element {
  const [torrent, setTorrent] = useState<AddedTorrent | null>(null)
  const [selected, setSelected] = useState<TorrentFileInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Connecting to peers…')
  const [progress, setProgress] = useState<{ numPeers: number; progress: number } | null>(null)

  useEffect(() => {
    let alive = true
    api
      .addTorrent(result)
      .then((t) => {
        if (!alive) return
        setTorrent(t)
        const videos = t.files.filter((f) => f.isVideo).sort((a, b) => b.length - a.length)
        setSelected(videos[0] || t.files[0] || null)
        setStatus('')
      })
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [result])

  useEffect(() => {
    if (!torrent) return
    let alive = true
    const tick = async (): Promise<void> => {
      const p = await api.getProgress(torrent.infoHash)
      if (alive && p.found) setProgress({ numPeers: p.numPeers, progress: p.progress })
    }
    const id = setInterval(tick, 1500)
    tick()
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [torrent])

  const url = torrent && selected ? api.streamUrl(torrent.infoHash, selected.index) : ''
  const subs = torrent?.files.filter((f) => f.isSubtitle) || []
  const isElectron = !!(window as any).streamhub

  function openIn(target: 'vlc' | 'infuse', streamUrl: string): void {
    if (isElectron) {
      api.openExternal(target, streamUrl)
      return
    }
    const enc = encodeURIComponent(streamUrl)
    window.location.href =
      target === 'infuse'
        ? `infuse://x-callback-url/play?url=${enc}`
        : `vlc-x-callback://x-callback-url/stream?url=${enc}`
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{result.title}</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="banner error">{error}</div>}
        {status && !error && <div className="loading-row"><span className="spinner" /> {status}</div>}
        {torrent && progress && (
          <div className="progress-row">
            {progress.numPeers} peer{progress.numPeers === 1 ? '' : 's'} · {Math.round(progress.progress * 100)}% buffered
            {progress.numPeers === 0 && <span className="seed-bad"> · no peers yet, this torrent may be dead</span>}
          </div>
        )}

        {selected && url && (
          <>
            <div className="video-wrap">
              {selected.browserPlayable ? (
                <video src={url} controls autoPlay className="video" />
              ) : (
                <div className="not-playable">
                  <p><strong>{selected.name.split('/').pop()}</strong></p>
                  <p>This container ({selected.name.split('.').pop()?.toUpperCase()}) won't play in the built-in player — use VLC or Infuse below, which also stream to your TV over AirPlay.</p>
                </div>
              )}
            </div>

            <div className="cast-row">
              <button onClick={() => openIn('infuse', url)}>🎞 Open in Infuse (AirPlay)</button>
              <button onClick={() => openIn('vlc', url)}>📺 Open in VLC (AirPlay)</button>
              <span className="hint">
                On iPhone: tap Infuse or VLC, then use the AirPlay button to send it to any AirPlay TV (Apple TV, LG, Samsung, Sony, Roku…). Install Infuse or VLC from the App Store first.
              </span>
            </div>
          </>
        )}

        {torrent && (
          <div className="filelist">
            <div className="filelist-head">Files in torrent ({torrent.files.length})</div>
            {torrent.files.map((f) => (
              <div
                key={f.index}
                className={`file-row ${selected?.index === f.index ? 'active' : ''} ${f.isVideo ? 'video' : ''}`}
                onClick={() => f.isVideo && setSelected(f)}
              >
                <span className="file-name">{f.isVideo ? '🎬' : f.isSubtitle ? '💬' : '📄'} {f.name.split('/').pop()}</span>
                <span className="file-size">{formatBytes(f.length)}</span>
              </div>
            ))}
            {subs.length > 0 && (
              <div className="subnote">
                {subs.length} external subtitle file{subs.length > 1 ? 's' : ''} in this torrent — load them in VLC/Infuse.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

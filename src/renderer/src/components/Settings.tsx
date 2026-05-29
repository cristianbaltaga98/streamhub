import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Props {
  onClose: () => void
}

export default function Settings({ onClose }: Props): JSX.Element {
  const [cfg, setCfg] = useState<any>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getConfig().then(setCfg)
  }, [])

  if (!cfg) return <></>

  function update(key: string, value: string): void {
    setCfg((c: any) => ({ ...c, [key]: value }))
    setSaved(false)
  }

  async function save(): Promise<void> {
    await api.saveConfig(cfg)
    setSaved(true)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Settings</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <label>Backend</label>
        <select value={cfg.backend} onChange={(e) => update('backend', e.target.value)}>
          <option value="prowlarr">Prowlarr</option>
          <option value="jackett">Jackett</option>
        </select>

        {cfg.backend === 'prowlarr' ? (
          <>
            <label>Prowlarr URL</label>
            <input value={cfg.prowlarrUrl} onChange={(e) => update('prowlarrUrl', e.target.value)} placeholder="http://localhost:9696" />
            <label>Prowlarr API Key</label>
            <input value={cfg.prowlarrApiKey} onChange={(e) => update('prowlarrApiKey', e.target.value)} placeholder="Settings ▸ General ▸ API Key" />
          </>
        ) : (
          <>
            <label>Jackett URL</label>
            <input value={cfg.jackettUrl} onChange={(e) => update('jackettUrl', e.target.value)} placeholder="http://localhost:9117" />
            <label>Jackett API Key</label>
            <input value={cfg.jackettApiKey} onChange={(e) => update('jackettApiKey', e.target.value)} />
          </>
        )}

        <div className="settings-actions">
          <button className="primary" onClick={save}>Save</button>
          {saved && <span className="saved">Saved ✓</span>}
        </div>

        <p className="settings-note">
          API key location: Prowlarr → Settings ▸ General ▸ Security ▸ API Key. Add RuTracker / Nyaa.si as indexers in Prowlarr first (Indexers ▸ Add Indexer).
        </p>
      </div>
    </div>
  )
}

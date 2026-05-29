import { useEffect, useMemo, useState } from 'react'
import { api, SearchResult, Meta } from './lib/api'
import { matchesLanguageFilter, LangCode } from '@shared/parse'
import { groupResults, MovieGroup } from './lib/group'
import MovieCard from './components/MovieCard'
import SourcesModal from './components/SourcesModal'
import Player from './components/Player'
import Settings from './components/Settings'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'movies', label: 'Movies' },
  { id: 'tv', label: 'TV' },
  { id: 'anime', label: 'Anime' }
]

const LANGS: { code: LangCode; label: string }[] = [
  { code: 'RU', label: 'Russian' },
  { code: 'EN', label: 'English' },
  { code: 'JA', label: 'Japanese' },
  { code: 'RO', label: 'Romanian' },
  { code: 'MULTI', label: 'Multi' }
]

const QUALITIES = ['720p', '1080p', '2160p']

export default function App(): JSX.Element {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [langFilter, setLangFilter] = useState<LangCode[]>([])
  const [qualityFilter, setQualityFilter] = useState<string[]>(['720p', '1080p'])
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<{ group: MovieGroup; meta: Meta | null } | null>(null)
  const [playing, setPlaying] = useState<SearchResult | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [configured, setConfigured] = useState(true)

  useEffect(() => {
    api
      .getConfig()
      .then((c) => {
        if (c.backend === 'jackett') setConfigured(!!c.jackettApiKey)
        else setConfigured(!!c.prowlarrApiKey)
      })
      .catch(() => setConfigured(false))
  }, [showSettings])

  async function runSearch(e?: React.FormEvent): Promise<void> {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      setResults(await api.search(query.trim(), category))
    } catch (err: any) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function toggleLang(code: LangCode): void {
    setLangFilter((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function toggleQuality(q: string): void {
    setQualityFilter((prev) => (prev.includes(q) ? prev.filter((c) => c !== q) : [...prev, q]))
  }

  const groups = useMemo(() => {
    const filtered = results
      .filter((r) => matchesLanguageFilter(r.parsed, langFilter))
      .filter((r) => !qualityFilter.length || !r.parsed.quality || qualityFilter.includes(r.parsed.quality))
    return groupResults(filtered)
  }, [results, langFilter, qualityFilter])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">🎬 StreamHub</div>
        <form className="searchbar" onSubmit={runSearch}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every tracker at once…" autoFocus />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </form>
        <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
      </header>

      <div className="langfilter">
        <span>Language:</span>
        {LANGS.map((l) => (
          <button key={l.code} className={langFilter.includes(l.code) ? 'chip active' : 'chip'} onClick={() => toggleLang(l.code)}>
            {l.label}
          </button>
        ))}
        <span className="filter-sep">Quality:</span>
        {QUALITIES.map((q) => (
          <button key={q} className={qualityFilter.includes(q) ? 'chip active' : 'chip'} onClick={() => toggleQuality(q)}>
            {q}
          </button>
        ))}
      </div>

      <main className="content">
        {!configured && (
          <div className="banner">
            No indexer API key set. Open <button className="link" onClick={() => setShowSettings(true)}>Settings</button> and paste your Prowlarr URL + API key.
          </div>
        )}
        {error && <div className="banner error">{error}</div>}
        {loading && <div className="empty"><span className="spinner" /> Searching trackers…</div>}
        {!loading && !error && results.length === 0 && <div className="empty">Search a movie, show, or anime title to begin.</div>}
        {!loading && results.length > 0 && groups.length === 0 && <div className="empty">No results match your filters.</div>}

        <div className="grid">
          {groups.map((g) => (
            <MovieCard key={g.key} group={g} onOpen={(group, meta) => setSelectedMovie({ group, meta })} />
          ))}
        </div>
      </main>

      {selectedMovie && (
        <SourcesModal
          group={selectedMovie.group}
          meta={selectedMovie.meta}
          onClose={() => setSelectedMovie(null)}
          onPlay={(r) => setPlaying(r)}
        />
      )}
      {playing && <Player result={playing} onClose={() => setPlaying(null)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}

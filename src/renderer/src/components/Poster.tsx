import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Poster({ title }: { title: string }): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api.getPoster(title).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [title])

  return (
    <div className="poster">
      {url ? <img src={url} alt="" loading="lazy" /> : <div className="poster-ph">🎞</div>}
    </div>
  )
}

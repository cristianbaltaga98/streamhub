export type LangCode = 'RU' | 'EN' | 'JA' | 'RO' | 'UK' | 'MULTI'

export interface ParsedRelease {
  quality: string | null
  source: string | null
  codec: string | null
  container: string | null
  audio: LangCode[]
  subs: LangCode[]
  multiAudio: boolean
  multiSub: boolean
  dualAudio: boolean
  releaseGroup: string | null
  isAnime: boolean
  badges: string[]
}

const RU_GROUPS = [
  'LostFilm', 'AlexFilm', 'NewStudio', 'Jaskier', 'Kerob', 'HamsterStudio',
  'BaibaKo', 'ColdFilm', 'Kubik', 'TVShows', 'NewStation', 'Gears Media',
  'OMSKBIRD', 'Profix Media', 'SunshineStudio', 'Дубль', 'Сербин', 'Гоблин'
]

const ANIME_GROUPS = [
  'SubsPlease', 'Erai-raws', 'Judas', 'EMBER', 'ASW', 'Anime Time',
  'Commie', 'HorribleSubs', 'GJM', 'Kaleido-subs', 'Doki', 'Tsundere',
  'Coalgirls', 'puyero', 'Cleo', 'Beatrice-Raws'
]

function has(haystack: string, needles: (string | RegExp)[]): boolean {
  return needles.some((n) =>
    typeof n === 'string' ? haystack.includes(n.toLowerCase()) : n.test(haystack)
  )
}

export function parseTitle(rawTitle: string): ParsedRelease {
  const title = rawTitle || ''
  const t = title.toLowerCase()

  let quality: string | null = null
  if (/\b(2160p|4k|uhd)\b/i.test(title)) quality = '2160p'
  else if (/\b1080p\b/i.test(title)) quality = '1080p'
  else if (/\b720p\b/i.test(title)) quality = '720p'
  else if (/\b(480p|sd)\b/i.test(title)) quality = '480p'
  else if (/\b(cam|ts|telesync|tc)\b/i.test(title)) quality = 'CAM'

  let source: string | null = null
  if (/\b(blu-?ray|bdrip|bdremux|remux|brrip)\b/i.test(title)) source = 'BluRay'
  else if (/\bweb-?dl\b/i.test(title)) source = 'WEB-DL'
  else if (/\bweb-?rip\b/i.test(title)) source = 'WEBRip'
  else if (/\bhdtv\b/i.test(title)) source = 'HDTV'
  else if (/\bdvdrip\b/i.test(title)) source = 'DVDRip'

  let codec: string | null = null
  if (/\b(x265|h\.?265|hevc)\b/i.test(title)) codec = 'HEVC'
  else if (/\b(x264|h\.?264|avc)\b/i.test(title)) codec = 'H.264'
  else if (/\b(av1)\b/i.test(title)) codec = 'AV1'

  let container: string | null = null
  if (/\.?\bmkv\b/i.test(title)) container = 'MKV'
  else if (/\.?\bmp4\b/i.test(title)) container = 'MP4'
  else if (/\.?\bavi\b/i.test(title)) container = 'AVI'

  const audio = new Set<LangCode>()
  const subs = new Set<LangCode>()

  const multiAudio = has(t, [/\bmulti\b/, /multi[-\s.]?audio/, /\bdual[-\s.]?audio\b/])
  const dualAudio = has(t, [/\bdual[-\s.]?audio\b/])
  const multiSub = has(t, [/multi[-\s.]?subs?/, /multisub/, /\bvostfr\b/])

  if (has(t, [/\brus\b/, /\bru\b/, /\bdub\b/, 'дубляж', 'rus dub', /\bdvo\b/, /\bmvo\b/, /\bavo\b/, 'русск'])) {
    audio.add('RU')
  }
  if (has(t, [/\beng\b/, /\ben\b/, /\benglish\b/])) audio.add('EN')
  if (has(t, [/\bjp\b/, /\bjpn\b/, /\bjapanese\b/, /\braw\b/])) audio.add('JA')
  if (has(t, [/\bukr\b/, /\bua\b/, 'українськ'])) audio.add('UK')
  if (multiAudio || dualAudio) audio.add('MULTI')

  if (has(t, [/\bvostfr\b/, /\bsubbed\b/, /\bsoftsubs?\b/, /\bsub\b/, /\bsubs\b/])) {
    if (!audio.has('JA')) audio.add('JA')
  }
  if (has(t, [/rus[\s.]?sub/, /\bsubru\b/, 'рус.суб', 'русские суб'])) subs.add('RU')
  if (has(t, [/eng[\s.]?sub/, /\bvostfr\b/, /\bsoftsubs?\b/, /\bmulti[-\s.]?subs?\b/])) subs.add('EN')
  if (has(t, [/\brom\b/, /\brou\b/, /romanian/, 'român'])) subs.add('RO')
  if (multiSub) {
    subs.add('EN')
    subs.add('RU')
  }

  const allGroups = [...RU_GROUPS, ...ANIME_GROUPS]
  const releaseGroup = allGroups.find((g) => t.includes(g.toLowerCase())) || null

  const isAnime =
    ANIME_GROUPS.some((g) => t.includes(g.toLowerCase())) ||
    has(t, [/\bvostfr\b/, /\bbatch\b/, /\b\[anime\]\b/, /\bova\b/, /\bbd\s?box\b/]) ||
    /\bs\d{1,2}\s?-\s?\d{2}\b/i.test(title)

  if (audio.size === 0 && !isAnime) audio.add('EN')

  const badges: string[] = []
  audio.forEach((a) => badges.push(`AUD:${a}`))
  subs.forEach((s) => badges.push(`SUB:${s}`))
  if (dualAudio) badges.push('DUAL')
  if (multiSub) badges.push('MULTI-SUB')
  if (releaseGroup) badges.push(releaseGroup)

  return {
    quality,
    source,
    codec,
    container,
    audio: [...audio],
    subs: [...subs],
    multiAudio,
    multiSub,
    dualAudio,
    releaseGroup,
    isAnime,
    badges
  }
}

export function cleanQuery(rawTitle: string): { query: string; year: string | null } {
  let s = (rawTitle || '').replace(/[._]/g, ' ')
  const yearMatch = s.match(/\b(19|20)\d{2}\b/)
  const year = yearMatch ? yearMatch[0] : null
  const cut = s.search(
    /\b(19|20)\d{2}\b|\bS\d{1,2}\b|\bSeason\b|\b\d{3,4}p\b|\b(2160p|1080p|720p|480p)\b|\b(web-?dl|webrip|bluray|bdrip|hdtv|dvdrip|x264|x265|hevc|remux)\b/i
  )
  if (cut > 0) s = s.slice(0, cut)
  return { query: s.replace(/[\[\(].*?[\]\)]/g, '').trim() || rawTitle, year }
}

export function matchesLanguageFilter(parsed: ParsedRelease, filter: LangCode[]): boolean {
  if (!filter.length) return true
  return filter.some(
    (f) => parsed.audio.includes(f) || parsed.subs.includes(f) || parsed.audio.includes('MULTI')
  )
}

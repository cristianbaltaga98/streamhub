import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface AppConfig {
  prowlarrUrl: string
  prowlarrApiKey: string
  jackettUrl: string
  jackettApiKey: string
  tmdbApiKey: string
  backend: 'prowlarr' | 'jackett'
}

const defaults: AppConfig = {
  prowlarrUrl: process.env.PROWLARR_URL || 'http://localhost:9696',
  prowlarrApiKey: process.env.PROWLARR_API_KEY || '',
  jackettUrl: process.env.JACKETT_URL || 'http://localhost:9117',
  jackettApiKey: process.env.JACKETT_API_KEY || '',
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  backend: 'prowlarr'
}

function configDir(): string {
  const dir = process.env.STREAMHUB_CONFIG_DIR || join(homedir(), '.streamhub')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function configPath(): string {
  return join(configDir(), 'config.json')
}

export function loadConfig(): AppConfig {
  const p = configPath()
  if (existsSync(p)) {
    try {
      return { ...defaults, ...JSON.parse(readFileSync(p, 'utf-8')) }
    } catch {
      return defaults
    }
  }
  return defaults
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...loadConfig(), ...patch }
  writeFileSync(configPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

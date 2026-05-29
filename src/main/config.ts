import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface AppConfig {
  prowlarrUrl: string
  prowlarrApiKey: string
  jackettUrl: string
  jackettApiKey: string
  backend: 'prowlarr' | 'jackett'
}

const defaults: AppConfig = {
  prowlarrUrl: process.env.PROWLARR_URL || 'http://localhost:9696',
  prowlarrApiKey: process.env.PROWLARR_API_KEY || '',
  jackettUrl: process.env.JACKETT_URL || 'http://localhost:9117',
  jackettApiKey: process.env.JACKETT_API_KEY || '',
  backend: 'prowlarr'
}

function configPath(): string {
  return join(app.getPath('userData'), 'streamhub-config.json')
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

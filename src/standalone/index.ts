import { resolve } from 'path'
import { networkInterfaces } from 'os'
import { startServer, SERVER_PORT } from '../main/server'

process.on('uncaughtException', (e) => console.error('[uncaught]', (e as any)?.message || e))
process.on('unhandledRejection', (e: any) => console.error('[unhandled]', e?.message || e))

function lanAddresses(): string[] {
  const out: string[] = []
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(ni.address)
    }
  }
  return out
}

const staticDir = resolve(process.cwd(), 'out/renderer')

startServer({ host: '0.0.0.0', staticDir }).then(() => {
  console.log('\nStreamHub server running.')
  console.log(`  Local:   http://localhost:${SERVER_PORT}`)
  for (const ip of lanAddresses()) console.log(`  Network: http://${ip}:${SERVER_PORT}`)
  console.log('\nOpen one of the Network URLs on your phone (same Wi-Fi),')
  console.log('or your Tailscale address to reach it from anywhere.\n')
})

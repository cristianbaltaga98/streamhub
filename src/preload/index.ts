import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('streamhub', {
  apiBase: 'http://127.0.0.1:6868'
})

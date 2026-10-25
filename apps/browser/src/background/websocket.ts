import { WebSocketMessage } from '@shared/types/websocket-message'
import { handle_messages } from './message-handler'
import { DEFAULT_PORT, CLIENT_TYPE } from '@shared/constants/websocket'
import browser from 'webextension-polyfill'

// Remote setups (Remote-SSH, WSL, Dev Containers) may forward the server to
// DEFAULT_PORT + 1 when the local DEFAULT_PORT is already occupied.
const ports_to_check = (): number[] => {
  return [DEFAULT_PORT, DEFAULT_PORT + 1]
}

const STALE_AFTER_MS = 20000
const CONNECT_TIMEOUT_MS = 2000
const RETRY_IDLE_MS = 5000

type Connection = {
  ws: WebSocket | null
  last_ping: number
  retry_timer: ReturnType<typeof setTimeout> | null
}

const connections = new Map<number, Connection>()

const client_id_to_port = new Map<string, number>()

const get_connection = (port: number): Connection => {
  let c = connections.get(port)
  if (!c) {
    c = { ws: null, last_ping: Date.now(), retry_timer: null }
    connections.set(port, c)
  }
  return c
}

const schedule_retry = (port: number, delay_ms: number) => {
  const c = get_connection(port)
  if (c.retry_timer) return
  c.retry_timer = setTimeout(() => {
    c.retry_timer = null
    connect_websocket(port)
  }, delay_ms)
}

const is_busy = (c: Connection) =>
  c.ws?.readyState === WebSocket.OPEN ||
  c.ws?.readyState === WebSocket.CONNECTING

const abandon_socket = (c: Connection) => {
  const ws = c.ws
  c.ws = null
  if (!ws) return
  ws.onopen = null
  ws.onmessage = null
  ws.onclose = null
  try {
    ws.close()
  } catch {}
}

export const check_and_recover_connection = () => {
  for (const port of ports_to_check()) {
    const c = get_connection(port)

    if (c.ws?.readyState === WebSocket.OPEN) {
      if (Date.now() - c.last_ping <= STALE_AFTER_MS) continue
      console.warn(
        `WebSocket on port ${port} is stale (no recent pings). Force reconnecting...`
      )
      abandon_socket(c)
    }

    if (!is_busy(c) && !c.retry_timer) {
      connect_websocket(port)
    }
  }
}

export const connect_websocket = async (port: number): Promise<void> => {
  const c = get_connection(port)
  if (is_busy(c)) return

  if (c.retry_timer) {
    clearTimeout(c.retry_timer)
    c.retry_timer = null
  }

  try {
    const manifest = browser.runtime.getManifest()
    const version = manifest.version
    const user_agent = navigator.userAgent

    const storage = await browser.storage.local.get([
      'browser-profile-name',
      'browser-id'
    ])
    const profile_name = (
      storage['browser-profile-name'] as string | undefined
    )?.trim()

    let browser_id = storage['browser-id'] as string | undefined
    if (!browser_id) {
      browser_id = crypto.randomUUID()
      await browser.storage.local.set({ 'browser-id': browser_id })
    }

    if (is_busy(c)) return

    let ws_url = `ws://localhost:${port}?client_type=${CLIENT_TYPE.BROWSER}&version=${version}&user_agent=${encodeURIComponent(user_agent)}&browser_id=${encodeURIComponent(browser_id)}`
    if (profile_name) {
      ws_url += `&profile_name=${encodeURIComponent(profile_name)}`
    }

    const ws = new WebSocket(ws_url)
    c.ws = ws
    c.last_ping = Date.now()
    let was_opened = false

    const connect_timer = setTimeout(() => {
      if (c.ws === ws && ws.readyState === WebSocket.CONNECTING) {
        abandon_socket(c)
        schedule_retry(port, RETRY_IDLE_MS)
      }
    }, CONNECT_TIMEOUT_MS)

    ws.onopen = () => {
      clearTimeout(connect_timer)
      if (c.ws !== ws) return
      was_opened = true
      c.last_ping = Date.now()
      console.log(`Connected with the VS Code on port ${port}!`)
      check_and_recover_connection()
    }

    ws.onmessage = (event) => {
      if (c.ws !== ws) return
      const message = JSON.parse(event.data)
      if (message.action === 'ping') {
        c.last_ping = Date.now()
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'pong' }))
        }
        return
      }
      if (message.action === 'initialize-chat' && message.client_id) {
        client_id_to_port.set(message.client_id, port)
      }
      handle_messages(message as WebSocketMessage)
    }

    ws.onclose = () => {
      clearTimeout(connect_timer)
      if (c.ws !== ws) return
      c.ws = null
      if (was_opened) {
        console.log(
          `Disconnected from VS Code on port ${port}, attempting to reconnect...`
        )
      }
      schedule_retry(port, RETRY_IDLE_MS)
    }
  } catch {
    c.ws = null
    schedule_retry(port, RETRY_IDLE_MS)
  }
}

const reset_all_connections = () => {
  for (const port of ports_to_check()) {
    const c = get_connection(port)
    if (c.retry_timer) {
      clearTimeout(c.retry_timer)
      c.retry_timer = null
    }
    const old_ws = c.ws
    c.ws = null
    old_ws?.close()
    connect_websocket(port)
  }
}

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['browser-profile-name']) {
    reset_all_connections()
  }
})

export const send_message_to_server = (message: any): boolean => {
  const json = JSON.stringify(message)
  const port: number | undefined = message?.client_id
    ? client_id_to_port.get(message.client_id)
    : undefined

  if (port === undefined && message.action === 'apply-response') {
    console.warn('Dropping apply-response message: unknown client_id')
    return false
  }

  const targets =
    port !== undefined ? [get_connection(port)] : [...connections.values()]

  let sent = false
  for (const c of targets) {
    if (c.ws?.readyState === WebSocket.OPEN) {
      c.ws.send(json)
      sent = true
    }
  }
  if (!sent) console.warn('WebSocket not connected, cannot send message')
  return sent
}

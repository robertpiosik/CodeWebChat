import { WebSocketMessage } from '@shared/types/websocket-message'
import { handle_messages } from './message-handler'
import { DEFAULT_PORT, CLIENT_TYPE } from '@shared/constants/websocket'
import browser from 'webextension-polyfill'
let websocket: WebSocket | null = null
let is_reconnecting = false
let last_ping_timestamp = Date.now()

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName == 'local' && changes['browser-profile-name']) {
    if (websocket) {
      is_reconnecting = false
      const old_ws = websocket
      websocket = null
      old_ws.close()
    }
    connect_websocket()
  }
})

export const check_server_health = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${DEFAULT_PORT}/health`)
    return response.ok
  } catch {
    return false
  }
}

export const check_and_recover_connection = () => {
  if (websocket?.readyState == WebSocket.OPEN) {
    if (Date.now() - last_ping_timestamp > 20000) {
      console.warn(
        'WebSocket connection is stale (no recent pings). Force reconnecting...'
      )
      is_reconnecting = false
      websocket.close()
    }
  }

  if (
    !is_reconnecting &&
    websocket?.readyState != WebSocket.OPEN &&
    websocket?.readyState != WebSocket.CONNECTING
  ) {
    connect_websocket()
  }
}

export const connect_websocket = async (): Promise<void> => {
  if (
    is_reconnecting ||
    websocket?.readyState == WebSocket.OPEN ||
    websocket?.readyState == WebSocket.CONNECTING
  ) {
    return
  }

  is_reconnecting = true
  last_ping_timestamp = Date.now()

  try {
    const is_healthy = await check_server_health()
    if (!is_healthy) {
      console.debug('Server health check failed, retrying in 5 seconds...')
      is_reconnecting = false
      setTimeout(check_and_recover_connection, 5000)
      return
    }

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

    let ws_url = `ws://localhost:${DEFAULT_PORT}?client_type=${CLIENT_TYPE.BROWSER}&version=${version}&user_agent=${encodeURIComponent(user_agent)}&browser_id=${encodeURIComponent(browser_id)}`
    if (profile_name) {
      ws_url += `&profile_name=${encodeURIComponent(profile_name)}`
    }

    const ws = new WebSocket(ws_url)
    websocket = ws

    ws.onopen = () => {
      if (websocket !== ws) return
      console.log('Connected with the VS Code!')
      is_reconnecting = false
      last_ping_timestamp = Date.now()
    }

    ws.onmessage = async (event) => {
      if (websocket !== ws) return
      const message = JSON.parse(event.data)
      if (message.action == 'ping') {
        last_ping_timestamp = Date.now()
        if (ws.readyState == WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'pong' }))
        }
        return
      }
      handle_messages(message as WebSocketMessage)
    }

    ws.onclose = () => {
      console.log('Disconnected from VS Code, attempting to reconnect...')
      if (websocket === ws) {
        websocket = null
      }
      is_reconnecting = false
      setTimeout(check_and_recover_connection, 1000)
    }

    ws.onerror = () => {
      if (websocket === ws) {
        websocket = null
      }
      is_reconnecting = false
      setTimeout(check_and_recover_connection, 1000)
    }
  } catch {
    is_reconnecting = false
    setTimeout(check_and_recover_connection, 5000)
  }
}

export const send_message_to_server = (message: any): boolean => {
  if (websocket?.readyState == WebSocket.OPEN) {
    websocket.send(JSON.stringify(message))
    return true
  }
  console.warn('WebSocket not connected, cannot send message')
  return false
}

import { WebSocketMessage } from '@shared/types/websocket-message'
import { handle_messages } from './message-handler'
import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import browser from 'webextension-polyfill'
let websocket: WebSocket | null = null
let is_reconnecting = false
let last_ping_timestamp = Date.now()

export const check_server_health = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${DEFAULT_PORT}/health`)
    return response.ok
  } catch {
    return false
  }
}

export const check_and_recover_connection = () => {
  if (websocket?.readyState === WebSocket.OPEN) {
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
    websocket?.readyState !== WebSocket.OPEN &&
    websocket?.readyState !== WebSocket.CONNECTING
  ) {
    connect_websocket()
  }
}

export const connect_websocket = async (): Promise<void> => {
  if (
    is_reconnecting ||
    websocket?.readyState === WebSocket.OPEN ||
    websocket?.readyState === WebSocket.CONNECTING
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
      return
    }

    const manifest = browser.runtime.getManifest()
    const version = manifest.version
    const user_agent = navigator.userAgent

    const ws = new WebSocket(
      `ws://localhost:${DEFAULT_PORT}?token=${SECURITY_TOKENS.BROWSERS}&version=${version}&user_agent=${encodeURIComponent(user_agent)}`
    )
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
      console.debug(message)
      handle_messages(message as WebSocketMessage)
    }

    ws.onclose = () => {
      console.log('Disconnected from VS Code, attempting to reconnect...')
      if (websocket === ws) {
        websocket = null
      }
      is_reconnecting = false
      // Reconnect attempt will be driven by the next alarm tick
    }

    ws.onerror = () => {
      if (websocket === ws) {
        websocket = null
      }
      is_reconnecting = false
    }
  } catch {
    is_reconnecting = false
  }
}

export const send_message_to_server = (message: any): boolean => {
  if (websocket?.readyState == WebSocket.OPEN) {
    console.debug('Sending message to server:', message)
    websocket.send(JSON.stringify(message))
    return true
  }
  console.warn('WebSocket not connected, cannot send message:', message)
  return false
}

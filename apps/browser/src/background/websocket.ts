import { WebSocketMessage } from '@shared/types/websocket-message'
import { handle_messages } from './message-handler'
import { CONFIG } from './config'
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
    // Server sends ping every 10s. If we missed pings (e.g., system slept), connection is a zombie.
    if (Date.now() - last_ping_timestamp > 20000) {
      console.warn(
        'WebSocket connection is stale (no recent pings). Force reconnecting...'
      )
      websocket.close()
    }
  } else if (
    !is_reconnecting &&
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
      setTimeout(() => {
        is_reconnecting = false
        connect_websocket()
      }, CONFIG.RECONNECT_DELAY)
      return
    }

    const manifest = browser.runtime.getManifest()
    const version = manifest.version
    const user_agent = navigator.userAgent

    websocket = new WebSocket(
      `ws://localhost:${DEFAULT_PORT}?token=${SECURITY_TOKENS.BROWSERS}&version=${version}&user_agent=${encodeURIComponent(user_agent)}`
    )

    websocket.onopen = () => {
      console.log('Connected with the VS Code!')
      is_reconnecting = false
      last_ping_timestamp = Date.now()
    }

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data)
      if (message.action === 'ping') {
        last_ping_timestamp = Date.now()
        return
      }
      console.debug(message)
      handle_messages(message as WebSocketMessage)
    }

    websocket.onclose = () => {
      console.log('Disconnected from VS Code, attempting to reconnect...')
      websocket = null
      is_reconnecting = false
      setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
    }

    websocket.onerror = () => {
      is_reconnecting = false
      websocket = null
    }
  } catch {
    is_reconnecting = false
    setTimeout(connect_websocket, CONFIG.RECONNECT_DELAY)
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

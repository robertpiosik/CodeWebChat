import { WebSocketMessage } from '@shared/types/websocket-message'
import { handle_messages } from './message-handler'
import { CONFIG } from './config'
import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import browser from 'webextension-polyfill'
let websocket: WebSocket | null = null
let is_reconnecting = false

export const check_server_health = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${DEFAULT_PORT}/health`)
    return response.ok
  } catch {
    return false
  }
}

export const connect_websocket = async (): Promise<void> => {
  if (is_reconnecting || websocket?.readyState === WebSocket.OPEN) {
    return
  }

  is_reconnecting = true

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
    }

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data) as WebSocketMessage
      console.debug(message)
      handle_messages(message)
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
  } catch (error) {
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

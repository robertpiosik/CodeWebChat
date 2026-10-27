import * as crypto from 'crypto'
import * as http from 'http'
import * as path from 'path'
import * as process from 'process'
import * as dotenv from 'dotenv'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws')
import { DEFAULT_PORT, CLIENT_TYPE } from '@shared/constants/websocket'

dotenv.config({ path: path.join(__dirname, '..', '.env') })

interface BrowserClient {
  ws: WebSocket
  version: string
  id: string
  user_agent: string
  profile_name?: string
  is_alive: boolean
}

interface VSCodeClient {
  ws: WebSocket
  client_id: string
  is_alive: boolean
}

class WebSocketServer {
  private vscode_clients: Map<string, VSCodeClient> = new Map()
  private browser_clients: Map<string, BrowserClient> = new Map()
  private connections: Set<WebSocket> = new Set()
  private server: http.Server
  private wss: any
  private shutdown_timer: NodeJS.Timeout | null = null

  constructor() {
    this.server = this._create_http_server()
    this.wss = new WebSocket.Server({
      server: this.server,
      maxPayload: 10 * 1024 * 1024,
      verifyClient: (info: any, cb: any) => {
        const url = new URL(info.req.url, `http://localhost:${DEFAULT_PORT}`)
        const client_type = url.searchParams.get('client_type')

        if (client_type === CLIENT_TYPE.BROWSER) {
          const origin = info.req.headers.origin

          // 1. Chrome / Edge / Chromium: Strict Exact Match
          if (
            origin === 'chrome-extension://ljookipcanaglfaocjbgdicfbdhhjffp'
          ) {
            return cb(true)
          }

          if (
            process.env.DEV_CHROME_EXTENSION_ID &&
            origin ==
              `chrome-extension://${process.env.DEV_CHROME_EXTENSION_ID}`
          ) {
            return cb(true)
          }

          // 2. Firefox: Wildcard fallback
          // (Firefox extensions get random origins, making exact matches impossible)
          if (origin && origin.startsWith('moz-extension://')) {
            return cb(true)
          }

          return cb(false, 403, 'Forbidden: Invalid Origin')
        }

        if (client_type === CLIENT_TYPE.EDITOR) {
          // 3. Editors: Enforce the shared file token
          const auth_header = info.req.headers.authorization
          let provided_token: string | null = null
          if (auth_header && auth_header.startsWith('Bearer ')) {
            provided_token = auth_header.substring(7)
          }

          const {
            get_or_create_shared_token
            // eslint-disable-next-line @typescript-eslint/no-var-requires
          } = require('../utils/shared-token')
          const expected_token = get_or_create_shared_token()

          if (provided_token && provided_token === expected_token) {
            return cb(true)
          }
          return cb(false, 401, 'Unauthorized: Invalid token')
        }

        cb(false, 400, 'Bad Request')
      }
    })
    this._setup_websocket_server()

    setInterval(() => this._ping_clients(), 10 * 1000)
    this._schedule_shutdown()

    console.log(`Starting WebSocket server process (PID: ${process.pid})`)
  }

  private _schedule_shutdown() {
    if (!this.shutdown_timer) {
      this.shutdown_timer = setTimeout(() => {
        if (this.vscode_clients.size === 0) {
          this._shutdown()
        }
      }, 10000)
    }
  }

  private _cancel_shutdown() {
    if (this.shutdown_timer) {
      clearTimeout(this.shutdown_timer)
      this.shutdown_timer = null
    }
  }

  private _create_http_server(): http.Server {
    return http.createServer((req: any, res: any) => {
      const url = new URL(req.url || '', `http://localhost:${DEFAULT_PORT}`)
      if (url.pathname === '/health') {
        const challenge = url.searchParams.get('challenge')
        const response: any = { status: 'ok' }

        if (challenge) {
          const {
            get_or_create_shared_token
            // eslint-disable-next-line @typescript-eslint/no-var-requires
          } = require('../utils/shared-token')
          const token = get_or_create_shared_token()
          const signature = crypto
            .createHmac('sha256', token)
            .update(challenge)
            .digest('hex')
          response.signature = signature
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
        return
      }

      res.writeHead(404)
      res.end()
    })
  }

  private _setup_websocket_server() {
    this.wss.on('connection', (ws: any, request: any) =>
      this._handle_connection(ws, request)
    )
  }

  private _handle_connection(ws: any, request: any) {
    const url = new URL(request.url || '', `http://localhost:${DEFAULT_PORT}`)
    const client_type = url.searchParams.get('client_type')

    if (
      client_type !== CLIENT_TYPE.BROWSER &&
      client_type !== CLIENT_TYPE.EDITOR
    ) {
      ws.close(1008, 'Invalid client type')
      return
    }

    const is_browser_client = client_type === CLIENT_TYPE.BROWSER

    if (is_browser_client) {
      this._handle_browser_connection(ws, url)
    } else {
      this._handle_vscode_connection(ws)
    }

    this.connections.add(ws)

    ws.on('error', (err: any) => console.error('WS Error:', err))
    ws.on('message', (message: any) => this._handle_message(message, ws))
    ws.on('close', () => this._handle_disconnection(ws, is_browser_client))
  }

  private _handle_browser_connection(ws: WebSocket, url: URL) {
    const version = url.searchParams.get('version') || 'unknown'
    const user_agent = url.searchParams.get('user_agent') || 'unknown'
    const profile_name = url.searchParams.get('profile_name') || undefined
    const id = url.searchParams.get('browser_id') || crypto.randomUUID()

    const client: BrowserClient = {
      ws,
      version,
      id,
      user_agent,
      profile_name,
      is_alive: true
    }
    this.browser_clients.set(id, client)

    this._notify_vscode_clients()
    ws.send(JSON.stringify({ action: 'connected', id }))
  }

  private _handle_vscode_connection(ws: WebSocket) {
    this._cancel_shutdown()

    const client_id = this._generate_client_id()
    this.vscode_clients.set(client_id, { ws, client_id, is_alive: true })

    ws.send(
      JSON.stringify({
        action: 'client-id-assignment',
        client_id
      })
    )

    ws.send(
      JSON.stringify({
        action: 'browser-connection-status',
        connected_browsers: this._get_connected_browsers_list()
      })
    )

    for (const client of this.browser_clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(
          JSON.stringify({
            action: 'vscode-client-connected',
            client_id
          })
        )
      }
    }
  }

  private _handle_message(message: any, ws: any) {
    const msg_string = message.toString()
    let msg_data
    try {
      msg_data = JSON.parse(msg_string)
    } catch {
      return
    }

    if (!msg_data || typeof msg_data !== 'object') {
      return
    }

    if (msg_data.action === 'pong') {
      for (const client of this.browser_clients.values()) {
        if (client.ws === ws) {
          client.is_alive = true
          return
        }
      }
      for (const client of this.vscode_clients.values()) {
        if (client.ws === ws) {
          client.is_alive = true
          return
        }
      }
      return
    }

    if (msg_data.action === 'initialize-chat') {
      if (msg_data.target_browser_id) {
        const client = this.browser_clients.get(msg_data.target_browser_id)
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(msg_string)
        }
      } else {
        const clients = Array.from(this.browser_clients.values())
        if (clients.length > 0) {
          const client = clients[clients.length - 1]
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(msg_string)
          }
        }
      }
    } else if (msg_data.action === 'apply-response') {
      const target_client_id = msg_data.client_id
      const target_client = this.vscode_clients.get(target_client_id)
      if (target_client && target_client.ws.readyState === WebSocket.OPEN) {
        target_client.ws.send(msg_string)
      }
    } else if (msg_data.action === 'forwarded-ports') {
      let sender_client_id: string | null = null
      for (const [client_id, client] of this.vscode_clients.entries()) {
        if (client.ws === ws) {
          sender_client_id = client_id
          break
        }
      }
      if (sender_client_id === null) return

      const tagged_message = JSON.stringify({
        ...msg_data,
        client_id: sender_client_id
      })
      for (const client of this.browser_clients.values()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(tagged_message)
        }
      }
    }
  }

  private _handle_disconnection(ws: WebSocket, is_browser_client: boolean) {
    if (is_browser_client) {
      for (const [id, client] of this.browser_clients.entries()) {
        if (client.ws === ws) {
          this.browser_clients.delete(id)
          break
        }
      }
      this._notify_vscode_clients()
    } else {
      let disconnected_client_id: string | null = null
      for (const [client_id, client] of this.vscode_clients.entries()) {
        if (client.ws === ws) {
          disconnected_client_id = client_id
          this.vscode_clients.delete(client_id)
          break
        }
      }

      if (disconnected_client_id !== null && this.browser_clients.size > 0) {
        const message = JSON.stringify({
          action: 'vscode-client-disconnected',
          client_id: disconnected_client_id
        })
        for (const client of this.browser_clients.values()) {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message)
          }
        }
      }
    }
    this.connections.delete(ws)

    if (this.vscode_clients.size === 0) {
      this._schedule_shutdown()
    }
  }

  private _generate_client_id(): string {
    return crypto.randomUUID()
  }

  private _get_connected_browsers_list() {
    return Array.from(this.browser_clients.values()).map((c) => ({
      id: c.id,
      version: c.version,
      user_agent: c.user_agent,
      profile_name: c.profile_name
    }))
  }

  private _notify_vscode_clients() {
    const message = JSON.stringify({
      action: 'browser-connection-status',
      connected_browsers: this._get_connected_browsers_list()
    })

    for (const client of this.vscode_clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message)
      }
    }
  }

  private _ping_clients() {
    const ping_message = JSON.stringify({ action: 'ping' })

    for (const client of this.browser_clients.values()) {
      if (!client.is_alive) {
        ;(client.ws as any).terminate()
        continue
      }
      client.is_alive = false
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(ping_message)
      }
    }

    for (const client of this.vscode_clients.values()) {
      if (!client.is_alive) {
        ;(client.ws as any).terminate()
        continue
      }
      client.is_alive = false
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(ping_message)
      }
    }
  }

  start() {
    this.server.listen(DEFAULT_PORT, '127.0.0.1', () => {
      console.log(
        `WebSocket server is running on ws://localhost:${DEFAULT_PORT}`
      )
    })
  }

  private _shutdown() {
    this.connections.forEach((ws) => {
      ws.close(1001, 'Server is shutting down')
    })
    this.wss.close()
    this.server.close(() => {
      process.exit(0)
    })
  }
}

const server = new WebSocketServer()
server.start()

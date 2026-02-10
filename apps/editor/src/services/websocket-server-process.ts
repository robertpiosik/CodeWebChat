import * as http from 'http'
import * as process from 'process'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws')

import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'

interface BrowserClient {
  ws: WebSocket
  version: string
  id: number
  user_agent: string
}

interface VSCodeClient {
  ws: WebSocket
  client_id: number
}

class WebSocketServer {
  private vscode_clients: Map<number, VSCodeClient> = new Map()
  private vscode_client_counter: number = 0
  private browser_clients: Map<number, BrowserClient> = new Map()
  private browser_client_counter: number = 0
  private connections: Set<WebSocket> = new Set()
  private vscode_extension_version: string | null = null
  private server: http.Server
  private wss: any

  constructor() {
    this.server = this._create_http_server()
    this.wss = new WebSocket.Server({ server: this.server })
    this._setup_websocket_server()

    setInterval(() => this._ping_clients(), 10 * 1000)

    console.log(`Starting WebSocket server process (PID: ${process.pid})`)
  }

  private _create_http_server(): http.Server {
    return http.createServer((req: any, res: any) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method == 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      if (req.url == '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'ok'
          })
        )
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
    const token = url.searchParams.get('token')

    if (token != SECURITY_TOKENS.BROWSERS && token != SECURITY_TOKENS.VSCODE) {
      ws.close(1008, 'Invalid security token')
      return
    }

    const is_browser_client = token == SECURITY_TOKENS.BROWSERS

    if (is_browser_client) {
      this._handle_browser_connection(ws, url)
    } else {
      this._handle_vscode_connection(ws, url)
    }

    this.connections.add(ws)

    ws.on('message', (message: any) => this._handle_message(message))
    ws.on('close', () => this._handle_disconnection(ws, is_browser_client))
  }

  private _handle_browser_connection(ws: WebSocket, url: URL) {
    const version = url.searchParams.get('version') || 'unknown'
    const user_agent = url.searchParams.get('user_agent') || 'unknown'

    this.browser_client_counter++
    const id = this.browser_client_counter

    const client: BrowserClient = { ws, version, id, user_agent }
    this.browser_clients.set(id, client)

    this._notify_vscode_clients()
    ws.send(JSON.stringify({ action: 'connected', id }))
  }

  private _handle_vscode_connection(ws: WebSocket, url: URL) {
    const incoming_vscode_extension_version = url.searchParams.get(
      'vscode_extension_version'
    )

    if (incoming_vscode_extension_version) {
      if (this.vscode_extension_version == null) {
        this.vscode_extension_version = incoming_vscode_extension_version
      } else {
        if (
          this.is_version_newer(
            incoming_vscode_extension_version,
            this.vscode_extension_version
          )
        ) {
          ws.close(1000, 'Server shutting down due to newer client version.')
          this._shutdown()
          return
        }
      }
    }

    const client_id = this._generate_client_id()
    this.vscode_clients.set(client_id, { ws, client_id })

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
            client_id,
            vscode_extension_version: this.vscode_extension_version
          })
        )
      }
    }
  }

  private _handle_message(message: any) {
    const msg_string = message.toString()
    const msg_data = JSON.parse(msg_string)

    if (msg_data.action == 'initialize-chat') {
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
    } else if (msg_data.action == 'apply-chat-response') {
      const target_client_id = msg_data.client_id
      const target_client = this.vscode_clients.get(target_client_id)
      if (target_client && target_client.ws.readyState == WebSocket.OPEN) {
        target_client.ws.send(msg_string)
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
      let disconnected_client_id: number | null = null
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
  }

  private _generate_client_id(): number {
    this.vscode_client_counter += 1
    return this.vscode_client_counter
  }

  private _get_connected_browsers_list() {
    return Array.from(this.browser_clients.values()).map((c) => ({
      id: c.id,
      version: c.version,
      user_agent: c.user_agent
    }))
  }

  private _notify_vscode_clients() {
    const message = JSON.stringify({
      action: 'browser-connection-status',
      connected_browsers: this._get_connected_browsers_list()
    })

    for (const client of this.vscode_clients.values()) {
      if (client.ws.readyState == WebSocket.OPEN) {
        client.ws.send(message)
      }
    }
  }

  private _ping_clients() {
    const pingMessage = JSON.stringify({ action: 'ping' })

    for (const client of this.browser_clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(pingMessage)
      }
    }

    for (const client of this.vscode_clients.values()) {
      if (client.ws.readyState == WebSocket.OPEN) {
        client.ws.send(
          JSON.stringify({
            action: 'ping',
            vscode_extension_version: this.vscode_extension_version
          })
        )
      }
    }
  }

  public start() {
    this.server.listen(DEFAULT_PORT, () => {
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

  private is_version_newer(v1: string, v2: string): boolean {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      if (p1 > p2) return true
      if (p1 < p2) return false
    }
    return false
  }
}

const server = new WebSocketServer()
server.start()

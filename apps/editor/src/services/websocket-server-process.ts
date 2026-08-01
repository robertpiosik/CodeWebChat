import * as http from 'http'
import * as process from 'process'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws')

import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'

const is_version_gte = (v: string, target: string) => {
  if (v === 'unknown') return false
  const vParts = v.split('.').map(Number)
  const tParts = target.split('.').map(Number)
  for (let i = 0; i < Math.max(vParts.length, tParts.length); i++) {
    const p1 = vParts[i] || 0
    const p2 = tParts[i] || 0
    if (p1 > p2) return true
    if (p1 < p2) return false
  }
  return true
}

interface BrowserClient {
  ws: WebSocket
  version: string
  id: number
  user_agent: string
  is_alive: boolean
}

interface VSCodeClient {
  ws: WebSocket
  client_id: number
  is_alive: boolean
}

class WebSocketServer {
  private vscode_clients: Map<number, VSCodeClient> = new Map()
  private vscode_client_counter: number = 0
  private browser_clients: Map<number, BrowserClient> = new Map()
  private browser_client_counter: number = 0
  private connections: Set<WebSocket> = new Set()
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
      this._handle_vscode_connection(ws)
    }

    this.connections.add(ws)

    ws.on('message', (message: any) => this._handle_message(message, ws))
    ws.on('close', () => this._handle_disconnection(ws, is_browser_client))
  }

  private _handle_browser_connection(ws: WebSocket, url: URL) {
    const version = url.searchParams.get('version') || 'unknown'
    const user_agent = url.searchParams.get('user_agent') || 'unknown'

    this.browser_client_counter++
    const id = this.browser_client_counter

    const client: BrowserClient = {
      ws,
      version,
      id,
      user_agent,
      is_alive: true
    }
    this.browser_clients.set(id, client)

    this._notify_vscode_clients()
    ws.send(JSON.stringify({ action: 'connected', id }))
  }

  private _handle_vscode_connection(ws: WebSocket) {
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
    } else if (
      msg_data.action == 'apply-response' ||
      msg_data.action == 'apply-chat-response' // Backward compatibility 20.07.26
    ) {
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
    const ping_message = JSON.stringify({ action: 'ping' })

    for (const client of this.browser_clients.values()) {
      const expects_pong = is_version_gte(client.version, '2026.7.2')

      if (expects_pong) {
        if (!client.is_alive) {
          ;(client.ws as any).terminate()
          continue
        }
        client.is_alive = false
      }
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
      if (client.ws.readyState == WebSocket.OPEN) {
        client.ws.send(ping_message)
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
}

const server = new WebSocketServer()
server.start()

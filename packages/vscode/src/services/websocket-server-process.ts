import * as http from 'http'
import * as process from 'process'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws') // ws works only with requrie

import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import { Website } from '@shared/types/websocket-message'

interface BrowserClient {
  ws: WebSocket
  version: string
}

interface VSCodeClient {
  ws: WebSocket
  client_id: number
}

class WebSocketServer {
  private vscode_clients: Map<number, VSCodeClient> = new Map()
  private vscode_client_counter: number = 0
  private current_browser_client: BrowserClient | null = null
  private connections: Set<WebSocket> = new Set()
  private vscode_extension_version: string | null = null
  private saved_websites: Website[] = []
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

  private _setup_websocket_server(): void {
    this.wss.on('connection', (ws: any, request: any) =>
      this._handle_connection(ws, request)
    )
  }

  private _handle_connection(ws: any, request: any): void {
    // Verify security token
    const url = new URL(request.url || '', `http://localhost:${DEFAULT_PORT}`)
    const token = url.searchParams.get('token')

    if (token != SECURITY_TOKENS.BROWSERS && token != SECURITY_TOKENS.VSCODE) {
      ws.close(1008, 'Invalid security token')
      return
    }

    // Track if this is a browser connection
    const is_browser_client = token == SECURITY_TOKENS.BROWSERS

    if (is_browser_client) {
      this._handle_browser_connection(ws, url)
    } else {
      this._handle_vscode_connection(ws, url)
    }

    this.connections.add(ws)

    // Handle messages from clients
    ws.on('message', (message: any) => this._handle_message(message))

    // Handle client disconnection
    ws.on('close', () => this._handle_disconnection(ws, is_browser_client))
  }

  private _handle_browser_connection(ws: WebSocket, url: URL): void {
    // Extract version from URL parameters
    const version = url.searchParams.get('version') || 'unknown'

    // Check if there is already a connected browser client
    if (
      this.current_browser_client &&
      this.current_browser_client.ws.readyState == WebSocket.OPEN
    ) {
      ws.close(1000, 'Another browser client is already connected')
      return
    }

    // Store the new browser client
    this.current_browser_client = { ws, version }
    this._notify_vscode_clients() // Notify when a browser connects
  }

  private _handle_vscode_connection(ws: WebSocket, url: URL): void {
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

    // Send the client ID to the VS Code client
    ws.send(
      JSON.stringify({
        action: 'client-id-assignment',
        client_id
      })
    )

    // Send initial status to new VS Code client
    ws.send(
      JSON.stringify({
        action: 'browser-connection-status',
        has_connected_browsers: this.current_browser_client !== null
      })
    )

    // Send saved websites to new VS Code client
    this._send_saved_websites_to_client(ws)

    // Notify browser when a new VSCode client connects (if browser is connected)
    if (
      this.current_browser_client &&
      this.current_browser_client.ws.readyState === WebSocket.OPEN
    ) {
      this.current_browser_client.ws.send(
        JSON.stringify({
          action: 'vscode-client-connected',
          client_id,
          vscode_extension_version: this.vscode_extension_version
        })
      )
    }
  }

  private _handle_message(message: any): void {
    const msg_string = message.toString()
    const msg_data = JSON.parse(msg_string)

    if (msg_data.action == 'initialize-chat') {
      if (
        this.current_browser_client &&
        this.current_browser_client.ws.readyState === WebSocket.OPEN
      ) {
        const browser_version = this.current_browser_client.version
        const needs_legacy_format = this._is_version_lower_than(
          browser_version,
          '1.2.0'
        )

        if (needs_legacy_format) {
          // Convert InitializeChatMessage to InitializeChatsMessage for older clients
          const legacy_message = {
            action: 'initialize-chats',
            text: msg_data.text,
            chats: [
              {
                url: msg_data.url,
                model: msg_data.model,
                temperature: msg_data.temperature,
                top_p: msg_data.top_p,
                thinking_budget: msg_data.thinking_budget,
                system_instructions: msg_data.system_instructions,
                options: msg_data.options
              }
            ],
            client_id: msg_data.client_id
          }
          this.current_browser_client.ws.send(JSON.stringify(legacy_message))
        } else {
          // Forward the message as-is for newer browser clients
          this.current_browser_client.ws.send(msg_string)
        }
      }
    } else if (msg_data.action == 'update-saved-websites') {
      // Store the updated websites
      this.saved_websites = msg_data.websites

      // Forward to VS Code clients
      for (const client of this.vscode_clients.values()) {
        if (client.ws.readyState == WebSocket.OPEN) {
          client.ws.send(msg_string)
        }
      }
    } else if (
      msg_data.action == 'invoke-fast-replace' || // <-- remove few weeks after 19 Apr 2025
      msg_data.action == 'apply-chat-response'
    ) {
      // Forward the message to the specific VS Code client based on client_id
      const target_client_id = msg_data.client_id
      const target_client = this.vscode_clients.get(target_client_id)
      if (target_client && target_client.ws.readyState == WebSocket.OPEN) {
        // target_client.ws.send(msg_string) <-- bring back after removing "invoke-fast-replace"
        target_client.ws.send(
          JSON.stringify({
            ...msg_data,
            action: 'apply-chat-response'
          })
        )
      }
    }
  }

  private _handle_disconnection(
    ws: WebSocket,
    is_browser_client: boolean
  ): void {
    if (
      is_browser_client &&
      this.current_browser_client &&
      this.current_browser_client.ws === ws
    ) {
      this.current_browser_client = null
      this._notify_vscode_clients() // Notify when the browser disconnects
    } else {
      // Find and remove the disconnected VS Code client
      let disconnected_client_id: number | null = null
      for (const [client_id, client] of this.vscode_clients.entries()) {
        if (client.ws === ws) {
          disconnected_client_id = client_id
          this.vscode_clients.delete(client_id)
          break
        }
      }

      // Notify browser when a VSCode client disconnects (if browser is connected)
      if (
        disconnected_client_id !== null &&
        this.current_browser_client &&
        this.current_browser_client.ws.readyState === WebSocket.OPEN
      ) {
        this.current_browser_client.ws.send(
          JSON.stringify({
            action: 'vscode-client-disconnected',
            client_id: disconnected_client_id
          })
        )
      }
    }
    this.connections.delete(ws)
  }

  private _generate_client_id(): number {
    this.vscode_client_counter += 1
    return this.vscode_client_counter
  }

  private _notify_vscode_clients(): void {
    const has_connected_browser = this.current_browser_client !== null
    const message = JSON.stringify({
      action: 'browser-connection-status',
      has_connected_browsers: has_connected_browser
    })

    for (const client of this.vscode_clients.values()) {
      if (client.ws.readyState == WebSocket.OPEN) {
        client.ws.send(message)
      }
    }
  }

  private _send_saved_websites_to_client(client: WebSocket): void {
    if (this.saved_websites.length > 0 && client.readyState == WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          action: 'update-saved-websites',
          websites: this.saved_websites
        })
      )
    }
  }

  private _ping_clients(): void {
    if (
      this.current_browser_client &&
      this.current_browser_client.ws.readyState == WebSocket.OPEN
    ) {
      this.current_browser_client.ws.send(JSON.stringify({ action: 'ping' }))
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

  public start(): void {
    this.server.listen(DEFAULT_PORT, () => {
      console.log(
        `WebSocket server is running on ws://localhost:${DEFAULT_PORT}`
      )
    })
  }

  private _shutdown(): void {
    this.connections.forEach((ws) => {
      ws.close(1001, 'Server is shutting down') // 1001: Going Away
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
    return false // Versions are equal or v1 is not newer
  }

  private _is_version_lower_than(
    version: string,
    target_version: string
  ): boolean {
    if (version === 'unknown') return true // Assume older version if unknown

    const parts1 = version.split('.').map(Number)
    const parts2 = target_version.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      if (p1 < p2) return true
      if (p1 > p2) return false
    }
    return false // Versions are equal
  }
}

const server = new WebSocketServer()
server.start()

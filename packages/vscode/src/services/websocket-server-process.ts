const WebSocket = require('ws') // ws works only with requrie
import * as http from 'http'
import * as process from 'process'

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

// Use Map to store VS Code clients with their IDs
const vscode_clients: Map<number, VSCodeClient> = new Map()
let vscode_client_counter = 0
let current_browser_client: BrowserClient | null = null
const connections: Set<WebSocket> = new Set()

let saved_websites: Website[] = []

// Function to generate a unique client ID using a counter
function generate_client_id(): number {
  vscode_client_counter += 1
  return vscode_client_counter
}

// Create HTTP server
const server = http.createServer((req: any, res: any) => {
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

// Create WebSocket server
const wss = new WebSocket.Server({ server })

// Notify VS Code clients about browser connection status
function notify_vscode_clients(): void {
  const has_connected_browser = current_browser_client !== null
  const message = JSON.stringify({
    action: 'browser-connection-status',
    has_connected_browsers: has_connected_browser
  })

  for (const client of vscode_clients.values()) {
    if (client.ws.readyState == WebSocket.OPEN) {
      client.ws.send(message)
    }
  }
}

// Send saved websites to a client
function send_saved_websites_to_client(client: WebSocket): void {
  if (saved_websites.length > 0 && client.readyState == WebSocket.OPEN) {
    client.send(
      JSON.stringify({
        action: 'update-saved-websites',
        websites: saved_websites
      })
    )
  }
}

// Send ping to browser client
function ping_clients(): void {
  if (
    current_browser_client &&
    current_browser_client.ws.readyState == WebSocket.OPEN
  ) {
    current_browser_client.ws.send(JSON.stringify({ action: 'ping' }))
  }
}

// Start periodic ping
setInterval(ping_clients, 10000) // Every 10 seconds

// Log server start information
console.log(`Starting WebSocket server process (PID: ${process.pid})`)

// Handle WebSocket connections
wss.on('connection', (ws: any, request: any) => {
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
    // Extract version from URL parameters
    const version = url.searchParams.get('version') || 'unknown'

    // Check if there is already a connected browser client
    if (
      current_browser_client &&
      current_browser_client.ws.readyState == WebSocket.OPEN
    ) {
      console.log(
        `Rejecting new browser client (version: ${version}) - another browser is already connected`
      )
      ws.close(1000, 'Another browser client is already connected')
      return
    }

    // Store the new browser client
    current_browser_client = { ws, version }
    console.log(`Browser client connected (version: ${version})`)
    notify_vscode_clients() // Notify when a browser connects
  } else {
    const client_id = generate_client_id()
    vscode_clients.set(client_id, { ws, client_id })
    console.log(`VS Code client connected with ID: ${client_id}`)

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
        has_connected_browsers: current_browser_client !== null
      })
    )

    // Send saved websites to new VS Code client
    send_saved_websites_to_client(ws)
  }

  connections.add(ws)

  // Handle messages from clients
  ws.on('message', (message: any) => {
    const msg_string = message.toString()
    const msg_data = JSON.parse(msg_string)

    // Handle different message types
    if (msg_data.action == 'initialize-chats') {
      if (
        current_browser_client &&
        current_browser_client.ws.readyState === WebSocket.OPEN
      ) {
        // Forward the message with client ID to browser client
        current_browser_client.ws.send(msg_string)
      }
    } else if (msg_data.action == 'update-saved-websites') {
      // Store the updated websites
      saved_websites = msg_data.websites

      // Forward to VS Code clients
      for (const client of vscode_clients.values()) {
        if (client.ws.readyState == WebSocket.OPEN) {
          client.ws.send(msg_string)
        }
      }
    } else if (msg_data.action == 'invoke-fast-replace') {
      // Forward the message to the specific VS Code client based on client_id
      const target_client_id = msg_data.client_id
      const target_client = vscode_clients.get(target_client_id)
      if (target_client && target_client.ws.readyState == WebSocket.OPEN) {
        target_client.ws.send(msg_string)
      }
    }
  })

  // Handle client disconnection
  ws.on('close', () => {
    if (
      is_browser_client &&
      current_browser_client &&
      current_browser_client.ws === ws
    ) {
      const version = current_browser_client.version
      current_browser_client = null
      console.log(`Browser client disconnected (version: ${version})`)
      notify_vscode_clients() // Notify when the browser disconnects
    } else if (!is_browser_client) {
      // Find and remove the VS Code client by its websocket instance
      for (const [client_id, client] of vscode_clients.entries()) {
        if (client.ws === ws) {
          vscode_clients.delete(client_id)
          console.log(`VS Code client disconnected: ${client_id}`)
          break
        }
      }
    }
    connections.delete(ws)
  })

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error)
    if (
      is_browser_client &&
      current_browser_client &&
      current_browser_client.ws === ws
    ) {
      const version = current_browser_client.version
      current_browser_client = null
      console.log(`Browser client error disconnect (version: ${version})`)
      notify_vscode_clients() // Notify when the browser disconnects due to error
    } else if (!is_browser_client) {
      // Find and remove the VS Code client by its websocket instance
      for (const [client_id, client] of vscode_clients.entries()) {
        if (client.ws === ws) {
          vscode_clients.delete(client_id)
          console.log(`VS Code client error disconnect: ${client_id}`)
          break
        }
      }
    }
    connections.delete(ws)
  })
})

// Start server
server.listen(DEFAULT_PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${DEFAULT_PORT}`)
})

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  shutdown()
})

process.on('SIGTERM', () => {
  shutdown()
})

function shutdown(): void {
  console.log('Shutting down WebSocket server...')

  // Close all connections
  connections.forEach((ws) => {
    ws.close()
  })
  connections.clear()
  vscode_clients.clear()
  current_browser_client = null
  saved_websites = []

  // Close server
  wss.close()
  server.close(() => {
    console.log('WebSocket server stopped')
    process.exit(0)
  })
}

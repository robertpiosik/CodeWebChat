import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import * as child_process from 'child_process'
import * as path from 'path'
import * as net from 'net'
import {
  InitializeChatMessage,
  UpdateSavedWebsitesMessage
} from '@shared/types/websocket-message'
import { CHATBOTS } from '@shared/constants/chatbots'
import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import { WebsitesProvider } from '../context/providers/websites-provider'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { Preset } from '@shared/types/preset'

/**
 * Bridges the current workspace window and websocket server that runs in a separate process.
 */
export class WebSocketManager {
  private context: vscode.ExtensionContext
  private port: number = DEFAULT_PORT
  private security_token: string = SECURITY_TOKENS.VSCODE
  private client: WebSocket.WebSocket | null = null
  private _on_connection_status_change: vscode.EventEmitter<boolean> =
    new vscode.EventEmitter<boolean>()
  private reconnect_timer: NodeJS.Timeout | null = null
  private has_connected_browsers: boolean = false
  private websites_provider: WebsitesProvider | null = null
  private client_id: number | null = null
  private current_extension_version: string
  private should_reconnect: boolean = true

  public readonly on_connection_status_change: vscode.Event<boolean> =
    this._on_connection_status_change.event

  constructor(
    context: vscode.ExtensionContext,
    websites_provider: WebsitesProvider
  ) {
    this.context = context
    this.websites_provider = websites_provider || null
    this.current_extension_version = context.extension.packageJSON.version
    this._initialize_server()
  }

  set_websites_provider(provider: WebsitesProvider): void {
    this.websites_provider = provider
  }

  private async _is_port_in_use(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net
        .createServer()
        .once('error', () => {
          resolve(true)
        })
        .once('listening', () => {
          tester.close()
          resolve(false)
        })
        .listen(port)
    })
  }

  private async _initialize_server() {
    try {
      const port_in_use = await this._is_port_in_use(this.port)

      if (!port_in_use) {
        await this._start_server_process()
      }

      this._connect_as_client()
    } catch (error) {
      Logger.error({
        function_name: 'initialize_server',
        message: 'Error initializing WebSocket server',
        data: error
      })
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_INITIALIZE_WEBSOCKET_SERVER(error)
      )
    }
  }

  private async _start_server_process() {
    const server_script_path = path.join(
      this.context.extensionPath,
      'out',
      'websocket-server-process.js'
    )

    try {
      const process = child_process.fork(server_script_path, [], {
        detached: true,
        stdio: 'ignore'
      })

      // Allow the parent process to exit independently
      if (process.pid) {
        process.unref()
      }

      Logger.info({
        function_name: '_start_server_process',
        message: `Started WebSocket server process with PID: ${process.pid}`
      })

      // Allow some time for the server to start up
      return new Promise<void>((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      Logger.error({
        function_name: '_start_server_process',
        message: 'Failed to start WebSocket server process',
        data: error
      })
      throw error
    }
  }

  private async _connect_as_client() {
    if (this.client) {
      this.client.close()
      this.client = null
    }

    this.client_id = null

    // Check if server is running, restart if not
    const port_in_use = await this._is_port_in_use(this.port)
    if (!port_in_use) {
      try {
        await this._start_server_process()
      } catch (error) {
        Logger.error({
          function_name: '_connect_as_client',
          message: 'Failed to restart WebSocket server',
          data: error
        })
        // If server fails to start, don't attempt to connect immediately
        if (this.should_reconnect) {
          this._schedule_reconnect()
        }
        return
      }
    }

    const ws_url = `ws://localhost:${this.port}?token=${this.security_token}&vscode_extension_version=${this.current_extension_version}`
    this.client = new WebSocket.WebSocket(ws_url)

    this.client.on('open', () => {
      Logger.info({
        function_name: 'connect_to_server',
        message: 'Connected to WebSocket server'
      })
    })

    this.client.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        Logger.info({
          function_name: 'connect_to_server',
          message: 'Incoming WS message',
          data: message
        })

        if (message.action == 'client-id-assignment') {
          this.client_id = message.client_id
        } else if (message.action == 'browser-connection-status') {
          this.has_connected_browsers = message.has_connected_browsers
          this._on_connection_status_change.fire(this.has_connected_browsers)
        } else if (message.action == 'update-saved-websites') {
          this.websites_provider?.update_websites(
            (message as UpdateSavedWebsitesMessage).websites
          )
        } else if (message.action == 'apply-chat-response') {
          vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
            raw_instructions: message.raw_instructions
          })
        } else if (message.action == 'ping') {
          if (message.vscode_extension_version) {
            const is_newer = this._is_version_newer(
              message.vscode_extension_version,
              this.current_extension_version
            )
            if (is_newer) {
              this.should_reconnect = false
              this.client?.close()
              vscode.window.showErrorMessage(
                dictionary.error_message.CWC_UPDATED_RELOAD_WINDOW
              )
            }
          }
        }
      } catch (error) {
        Logger.error({
          function_name: 'connect_to_server',
          message: 'Error processing message',
          data: error
        })
      }
    })

    this.client.on('error', (error) => {
      Logger.error({
        function_name: 'connect_to_server',
        message: 'WebSocket client error',
        data: error
      })
      this.has_connected_browsers = false
      this._on_connection_status_change.fire(false)

      if (this.should_reconnect) {
        this._schedule_reconnect()
      }
    })

    this.client.on('close', () => {
      Logger.warn({
        function_name: 'connect_to_server',
        message: 'Disconnected from WebSocket server'
      })
      this.has_connected_browsers = false
      this._on_connection_status_change.fire(false)

      if (this.should_reconnect) {
        this._schedule_reconnect()
      }
    })
  }

  private _schedule_reconnect() {
    // Clear existing reconnect timer
    if (this.reconnect_timer) {
      clearTimeout(this.reconnect_timer)
    }

    // Try to reconnect after 3 seconds
    this.reconnect_timer = setTimeout(() => {
      this._connect_as_client()
    }, 3000)
  }

  private _is_version_newer(v1: string, v2: string): boolean {
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

  is_connected_with_browser(): boolean {
    return this.has_connected_browsers
  }

  public async initialize_chats(params: {
    chats: Array<{
      text: string
      preset_name: string
      raw_instructions?: string
      mode: any
    }>
    presets_config_key: string
    without_submission?: boolean
  }): Promise<void> {
    if (!this.has_connected_browsers) {
      throw new Error('Does not have connected browsers.')
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_chat_presets = config.get<any[]>(params.presets_config_key) ?? []

    for (const chat of params.chats) {
      const preset = web_chat_presets.find((p) => p.name == chat.preset_name)
      if (!preset) {
        continue
      }

      const chatbot = CHATBOTS[preset.chatbot as keyof typeof CHATBOTS]
      let url: string
      if (preset.chatbot == 'Open WebUI') {
        if (preset.port) {
          url = `http://localhost:${preset.port}/`
        } else {
          url = 'http://openwebui/'
        }
      } else {
        url = chatbot.url
      }

      const message: InitializeChatMessage = {
        action: 'initialize-chat',
        text: chat.text,
        url,
        model: preset.model,
        temperature: preset.temperature,
        top_p: preset.top_p,
        thinking_budget: preset.thinkingBudget,
        reasoning_effort: preset.reasoningEffort,
        system_instructions: preset.systemInstructions,
        options: preset.options,
        client_id: this.client_id || 0, // 0 is a temporary fallback and should be removed few weeks from 28.03.25
        without_submission: params.without_submission,
        raw_instructions: chat.raw_instructions,
        mode: chat.mode
      }

      Logger.info({
        function_name: 'initialize_chats',
        message: 'Sending initialize chat message',
        data: message
      })

      this.client?.send(JSON.stringify(message))
    }
  }

  public async preview_preset(
    instruction: string,
    preset: Preset
  ): Promise<void> {
    if (!this.has_connected_browsers) {
      throw new Error('Does not have connected browsers.')
    }

    const chatbot = CHATBOTS[preset.chatbot as keyof typeof CHATBOTS]
    let url: string
    if (preset.chatbot == 'Open WebUI') {
      if (preset.port) {
        url = `http://localhost:${preset.port}/`
      } else {
        url = 'http://openwebui/'
      }
    } else {
      url = chatbot.url
    }

    const message: InitializeChatMessage = {
      action: 'initialize-chat',
      text: instruction,
      url,
      model: preset.model,
      temperature: preset.temperature,
      top_p: preset.top_p,
      thinking_budget: preset.thinking_budget,
      reasoning_effort: preset.reasoning_effort,
      system_instructions: preset.system_instructions,
      options: preset.options,
      client_id: this.client_id || 0, // 0 is a temporary fallback and should be removed few weeks from 28.03.25
      raw_instructions: instruction
    }

    Logger.info({
      function_name: 'preview_preset',
      message: 'Sending preview preset message',
      data: message
    })

    this.client?.send(JSON.stringify(message))
  }
}

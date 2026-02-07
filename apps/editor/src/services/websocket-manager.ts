import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import * as child_process from 'child_process'
import * as path from 'path'
import * as net from 'net'
import {
  ConnectedBrowser,
  InitializeChatMessage
} from '@shared/types/websocket-message'
import { CHATBOTS } from '@shared/constants/chatbots'
import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { Preset } from '@shared/types/preset'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'
import { LAST_SELECTED_BROWSER_ID_STATE_KEY } from '@/constants/state-keys'

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
  private connected_browsers: ConnectedBrowser[] = []
  private reconnect_timer: NodeJS.Timeout | null = null
  private has_connected_browsers: boolean = false
  private client_id: number | null = null
  private current_extension_version: string
  private should_reconnect: boolean = true

  public readonly on_connection_status_change: vscode.Event<boolean> =
    this._on_connection_status_change.event

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.current_extension_version = context.extension.packageJSON.version
    this._initialize_server()
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
        function_name: '_initialize_server',
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
        function_name: '_connect_as_client',
        message: 'Connected to WebSocket server'
      })
    })

    this.client.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        Logger.info({
          function_name: '_connect_as_client',
          message: 'Incoming WS message',
          data: message
        })

        if (message.action == 'client-id-assignment') {
          this.client_id = message.client_id
        } else if (message.action == 'browser-connection-status') {
          this.connected_browsers = message.connected_browsers
          this.has_connected_browsers = this.connected_browsers.length > 0
          this._on_connection_status_change.fire(this.has_connected_browsers)
        } else if (message.action == 'apply-chat-response') {
          vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
            raw_instructions: message.raw_instructions,
            edit_format: message.edit_format
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
          function_name: '_connect_as_client',
          message: 'Error processing message',
          data: error
        })
      }
    })

    this.client.on('error', (error) => {
      Logger.error({
        function_name: '_connect_as_client',
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
        function_name: '_connect_as_client',
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

  private _get_browser_name(user_agent: string): string {
    if (user_agent.includes('Edg/')) {
      return 'Edge'
    } else if (user_agent.includes('Chrome/')) {
      return 'Chrome'
    } else if (user_agent.includes('Firefox/')) {
      return 'Firefox'
    } else if (user_agent.includes('Safari/')) {
      return 'Safari'
    } else {
      return 'Browser'
    }
  }

  private async _select_browser(): Promise<number | undefined> {
    if (this.connected_browsers.length == 0) {
      return undefined
    }

    if (this.connected_browsers.length == 1) {
      const id = this.connected_browsers[0].id
      await this.context.workspaceState.update(
        LAST_SELECTED_BROWSER_ID_STATE_KEY,
        id
      )
      return id
    }

    const last_selected_browser_id = this.context.workspaceState.get<number>(
      LAST_SELECTED_BROWSER_ID_STATE_KEY
    )

    const items = this.connected_browsers.map((b) => ({
      label: this._get_browser_name(b.user_agent),
      detail: b.user_agent,
      id: b.id
    }))

    return new Promise<number | undefined>((resolve) => {
      const quick_pick = vscode.window.createQuickPick<
        vscode.QuickPickItem & { id: number }
      >()
      quick_pick.items = items

      if (last_selected_browser_id) {
        const active_item = items.find(
          (item) => item.id == last_selected_browser_id
        )
        if (active_item) {
          quick_pick.activeItems = [active_item]
        }
      }

      quick_pick.placeholder = 'Select a browser to use'
      quick_pick.title = 'Connected Browsers'

      const close_button = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }

      quick_pick.buttons = [close_button]

      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          if (button === close_button) {
            quick_pick.hide()
          }
        })
      )

      disposables.push(
        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          if (selected) {
            await this.context.workspaceState.update(
              LAST_SELECTED_BROWSER_ID_STATE_KEY,
              selected.id
            )
            resolve(selected.id)
          }
          quick_pick.hide()
        })
      )

      disposables.push(
        quick_pick.onDidHide(() => {
          resolve(undefined)
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )

      quick_pick.show()
    })
  }

  public async initialize_chats(params: {
    chats: Array<{
      text: string
      preset_name: string
      raw_instructions?: string
      edit_format?: string
      prompt_type: any
    }>
    presets_config_key: string
  }): Promise<boolean> {
    if (!this.has_connected_browsers) {
      throw new Error('Does not have connected browsers.')
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_chat_presets =
      config.get<ConfigPresetFormat[]>(params.presets_config_key) ?? []
    const gemini_user_id = config.get<number | null>('geminiUserId')
    const ai_studio_user_id = config.get<number | null>('aiStudioUserId')

    const target_browser_id = await this._select_browser()
    if (target_browser_id === undefined) {
      return false // User cancelled or no browser
    }

    for (const chat of params.chats) {
      const preset = web_chat_presets.find((p) => p.name == chat.preset_name)
      if (!preset) {
        continue
      }

      const chatbot = CHATBOTS[preset.chatbot as keyof typeof CHATBOTS]
      let url: string
      if (preset.chatbot == 'AI Studio') {
        let base_url = chatbot.url
        if (ai_studio_user_id !== null && ai_studio_user_id !== undefined) {
          base_url = base_url.replace(
            'https://aistudio.google.com/',
            `https://aistudio.google.com/u/${ai_studio_user_id}/`
          )
        }
        if (preset.model) {
          url = `${base_url}?model=${preset.model}`
        } else {
          url = base_url
        }
      } else if (preset.chatbot == 'Open WebUI') {
        if (preset.port) {
          url = `http://localhost:${preset.port}/`
        } else {
          url = 'http://openwebui/'
        }
      } else if (preset.chatbot == 'Gemini' && gemini_user_id) {
        url = `https://gemini.google.com/u/${gemini_user_id}/app`
      } else if (chatbot.supports_url_override && preset.newUrl) {
        try {
          const original_domain = new URL(chatbot.url).hostname
          const new_domain = new URL(preset.newUrl).hostname
          if (original_domain == new_domain) {
            url = preset.newUrl
          } else {
            url = chatbot.url
            vscode.window.showWarningMessage(
              dictionary.warning_message.URL_OVERRIDE_DIFFERENT_DOMAIN(
                preset.name!
              )
            )
          }
        } catch (error) {
          url = chatbot.url
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
        target_browser_id,
        top_p: preset.topP,
        thinking_budget: preset.thinkingBudget,
        reasoning_effort: preset.reasoningEffort,
        system_instructions: preset.systemInstructions,
        options: preset.options,
        client_id: this.client_id || 0, // 0 is a temporary fallback and should be removed few weeks from 28.03.25
        raw_instructions: chat.raw_instructions,
        edit_format: chat.edit_format,
        prompt_type: chat.prompt_type
      }

      Logger.info({
        function_name: 'initialize_chats',
        message: 'Sending initialize chat message',
        data: message
      })

      this.client?.send(JSON.stringify(message))
    }

    return true
  }

  public async preview_preset(params: {
    instruction: string
    preset: Preset
    raw_instructions: string
    prompt_type: any
  }): Promise<void> {
    if (!this.has_connected_browsers) {
      throw new Error('Does not have connected browsers.')
    }

    const target_browser_id = await this._select_browser()
    if (target_browser_id === undefined) {
      return // User cancelled
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const gemini_user_number = config.get<number | null>('geminiUserNumber')
    const ai_studio_user_id = config.get<number | null>('aiStudioUserId')

    const chatbot = CHATBOTS[params.preset.chatbot as keyof typeof CHATBOTS]
    let url: string
    if (params.preset.chatbot == 'AI Studio') {
      let base_url = chatbot.url
      if (ai_studio_user_id !== null && ai_studio_user_id !== undefined) {
        base_url = base_url.replace(
          'https://aistudio.google.com/',
          `https://aistudio.google.com/u/${ai_studio_user_id}/`
        )
      }
      if (params.preset.model) {
        url = `${base_url}?model=${params.preset.model}`
      } else {
        url = base_url
      }
    } else if (params.preset.chatbot == 'Open WebUI') {
      if (params.preset.port) {
        url = `http://localhost:${params.preset.port}/`
      } else {
        url = 'http://openwebui/'
      }
    } else if (
      params.preset.chatbot == 'Gemini' &&
      gemini_user_number !== undefined &&
      gemini_user_number !== null
    ) {
      url = `https://gemini.google.com/u/${gemini_user_number}`
    } else if (chatbot.supports_url_override && params.preset.new_url) {
      try {
        const original_domain = new URL(chatbot.url).hostname
        const new_domain = new URL(params.preset.new_url).hostname
        if (original_domain == new_domain) {
          url = params.preset.new_url
        } else {
          url = chatbot.url
          vscode.window.showWarningMessage(
            dictionary.warning_message.URL_OVERRIDE_DIFFERENT_DOMAIN(
              params.preset.name!
            )
          )
        }
      } catch (error) {
        url = chatbot.url
      }
    } else {
      url = chatbot.url
    }

    const message: InitializeChatMessage = {
      action: 'initialize-chat',
      text: params.instruction,
      url,
      model: params.preset.model,
      temperature: params.preset.temperature,
      target_browser_id,
      top_p: params.preset.top_p,
      thinking_budget: params.preset.thinking_budget,
      reasoning_effort: params.preset.reasoning_effort,
      system_instructions: params.preset.system_instructions,
      options: params.preset.options,
      client_id: this.client_id || 0, // 0 is a temporary fallback and should be removed few weeks from 28.03.25
      raw_instructions: params.raw_instructions,
      prompt_type: params.prompt_type
    }

    Logger.info({
      function_name: 'preview_preset',
      message: 'Sending preview preset message',
      data: message
    })

    this.client?.send(JSON.stringify(message))
  }
}

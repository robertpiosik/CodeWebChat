import * as WebSocket from 'ws'
import * as vscode from 'vscode'
import * as child_process from 'child_process'
import * as http from 'http'
import * as path from 'path'
import * as net from 'net'
import {
  ConnectedBrowser,
  InitializeChatMessage,
  WebSocketMessage
} from '@shared/types/websocket-message'
import { CHATBOTS } from '@shared/constants/chatbots'
import { DEFAULT_PORT, SECURITY_TOKENS } from '@shared/constants/websocket'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { WebConfiguration } from '@shared/types/web-configuration'
import { ConfigWebConfigurationFormat } from '@/views/utils/web-configuration-format-converters'
import { LAST_SELECTED_BROWSER_ID_STATE_KEY } from '@/constants/state-keys'
import { ApplyChatResponseCommandArgs } from '@/commands/apply-chat-response-command/response-processor'
import { WebPromptType } from '@shared/types/prompt-types'

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

  public readonly on_connection_status_change: vscode.Event<boolean> =
    this._on_connection_status_change.event

  constructor(context: vscode.ExtensionContext) {
    this.context = context
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
          tester.close(() => {
            resolve(false)
          })
        })
        .listen(port)
    })
  }

  private async _initialize_server() {
    try {
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
      const spawned = child_process.spawn(process.execPath, [server_script_path], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
      })

      if (spawned.pid) {
        spawned.unref()
      }

      Logger.info({
        function_name: '_start_server_process',
        message: `Started WebSocket server process with PID: ${spawned.pid}`
      })

      return this._wait_for_server_ready()
    } catch (error) {
      Logger.error({
        function_name: '_start_server_process',
        message: 'Failed to start WebSocket server process',
        data: error
      })
      throw error
    }
  }

  private _wait_for_server_ready(
    retries = 20,
    interval_ms = 250
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0

      const check = () => {
        const req = http.get(
          `http://localhost:${this.port}/health`,
          (res) => {
            if (res.statusCode === 200) {
              resolve()
            } else {
              retry()
            }
          }
        )
        req.on('error', retry)
        req.end()
      }

      const retry = () => {
        attempts++
        if (attempts >= retries) {
          reject(new Error(`WebSocket server did not become ready after ${retries} attempts`))
        } else {
          setTimeout(check, interval_ms)
        }
      }

      check()
    })
  }

  private async _connect_as_client() {
    if (this.client) {
      this.client.close()
      this.client = null
    }

    this.client_id = null

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
        this._schedule_reconnect()
        return
      }
    }

    const ws_url = `ws://localhost:${this.port}?token=${this.security_token}`
    this.client = new WebSocket.WebSocket(ws_url)

    this.client.on('open', () => {
      Logger.info({
        function_name: '_connect_as_client',
        message: 'Connected to WebSocket server'
      })
    })

    this.client.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage
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
            url: message.url
          } as ApplyChatResponseCommandArgs)
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

      this._schedule_reconnect()
    })

    this.client.on('close', () => {
      Logger.warn({
        function_name: '_connect_as_client',
        message: 'Disconnected from WebSocket server'
      })
      this.has_connected_browsers = false
      this._on_connection_status_change.fire(false)

      this._schedule_reconnect()
    })
  }

  private _schedule_reconnect() {
    if (this.reconnect_timer) {
      clearTimeout(this.reconnect_timer)
    }

    this.reconnect_timer = setTimeout(() => {
      this._connect_as_client()
    }, 3000)
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

  public async initialize_chat(params: {
    text: string
    web_configuration_name: string
    raw_instructions?: string
    edit_format?: string
    prompt_type?: WebPromptType
    invocation_count: number
  }): Promise<boolean> {
    if (!this.has_connected_browsers) {
      throw new Error('Does not have connected browsers.')
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_configurations =
      config.get<ConfigWebConfigurationFormat[]>('webConfigurations') ?? []
    const gemini_user_id = config.get<number | null>('geminiUserId')
    const ai_studio_user_id = config.get<number | null>('aiStudioUserId')
    const reuse_last_tab =
      params.invocation_count > 1
        ? false
        : config.get<boolean>('reuseLastTab', false)

    const target_browser_id = await this._select_browser()
    if (target_browser_id === undefined) {
      return false
    }

    const web_configuration = web_configurations.find((p) => p.name == params.web_configuration_name)
    if (!web_configuration) {
      return false
    }

    const chatbot = CHATBOTS[web_configuration.chatbot as keyof typeof CHATBOTS]
    let url: string
    if (web_configuration.chatbot == 'AI Studio') {
      let base_url = chatbot.url
      if (ai_studio_user_id !== null && ai_studio_user_id !== undefined) {
        base_url = base_url.replace(
          'https://aistudio.google.com/',
          `https://aistudio.google.com/u/${ai_studio_user_id}/`
        )
      }
      if (web_configuration.model) {
        url = `${base_url}?model=${web_configuration.model}`
      } else {
        url = base_url
      }
    } else if (web_configuration.chatbot == 'Open WebUI') {
      if (web_configuration.port) {
        url = `http://localhost:${web_configuration.port}/`
      } else {
        url = 'http://openwebui/'
      }
    } else if (web_configuration.chatbot == 'Arena') {
      if (web_configuration.model) {
        url = `https://arena.ai/?mode=direct&model=${web_configuration.model}`
      } else {
        url = chatbot.url
      }
    } else if (web_configuration.chatbot == 'Gemini' && gemini_user_id) {
      url = `https://gemini.google.com/u/${gemini_user_id}/app`
    } else if (chatbot.supports_url_override && web_configuration.newUrl) {
      try {
        const original_domain = new URL(chatbot.url).hostname
        const new_domain = new URL(web_configuration.newUrl).hostname
        if (original_domain == new_domain) {
          url = web_configuration.newUrl
        } else {
          url = chatbot.url
          vscode.window.showWarningMessage(
            dictionary.warning_message.URL_OVERRIDE_DIFFERENT_DOMAIN(
              web_configuration.name!
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
      text: params.text,
      url,
      model: web_configuration.model,
      temperature: web_configuration.temperature,
      target_browser_id,
      top_p: web_configuration.topP,
      thinking_budget: web_configuration.thinkingBudget,
      reasoning_effort: web_configuration.reasoningEffort,
      system_instructions: web_configuration.systemInstructions,
      options: web_configuration.options,
      client_id: this.client_id || 0, // 0 is a temporary fallback and should be removed few weeks from 28.03.25
      raw_instructions: params.raw_instructions,
      edit_format: params.edit_format,
      prompt_type: params.prompt_type,
      reuse_last_tab,
      invocation_count: params.invocation_count
    }

    Logger.info({
      function_name: 'initialize_chat',
      message: 'Sending initialize chat message',
      data: message
    })

    this.client?.send(JSON.stringify(message))

    return true
  }

  public async preview_web_configuration(params: {
    instruction: string
    web_configuration: WebConfiguration
    raw_instructions: string
    prompt_type?: WebPromptType
  }): Promise<boolean> {
    if (!this.has_connected_browsers) {
      throw new Error('Does not have connected browsers.')
    }

    const target_browser_id = await this._select_browser()
    if (target_browser_id === undefined) {
      return false
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const gemini_user_number = config.get<number | null>('geminiUserNumber')
    const ai_studio_user_id = config.get<number | null>('aiStudioUserId')
    const reuse_last_tab = config.get<boolean>('reuseLastTab', false)

    const chatbot = CHATBOTS[params.web_configuration.chatbot as keyof typeof CHATBOTS]
    let url: string
    if (params.web_configuration.chatbot == 'AI Studio') {
      let base_url = chatbot.url
      if (ai_studio_user_id !== null && ai_studio_user_id !== undefined) {
        base_url = base_url.replace(
          'https://aistudio.google.com/',
          `https://aistudio.google.com/u/${ai_studio_user_id}/`
        )
      }
      if (params.web_configuration.model) {
        url = `${base_url}?model=${params.web_configuration.model}`
      } else {
        url = base_url
      }
    } else if (params.web_configuration.chatbot == 'Open WebUI') {
      if (params.web_configuration.port) {
        url = `http://localhost:${params.web_configuration.port}/`
      } else {
        url = 'http://openwebui/'
      }
    } else if (params.web_configuration.chatbot == 'Arena') {
      if (params.web_configuration.model) {
        url = `https://arena.ai/?mode=direct&model=${params.web_configuration.model}`
      } else {
        url = chatbot.url
      }
    } else if (
      params.web_configuration.chatbot == 'Gemini' &&
      gemini_user_number !== undefined &&
      gemini_user_number !== null
    ) {
      url = `https://gemini.google.com/u/${gemini_user_number}`
    } else if (chatbot.supports_url_override && params.web_configuration.new_url) {
      try {
        const original_domain = new URL(chatbot.url).hostname
        const new_domain = new URL(params.web_configuration.new_url).hostname
        if (original_domain == new_domain) {
          url = params.web_configuration.new_url
        } else {
          url = chatbot.url
          vscode.window.showWarningMessage(
            dictionary.warning_message.URL_OVERRIDE_DIFFERENT_DOMAIN(
              params.web_configuration.name!
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
      model: params.web_configuration.model,
      temperature: params.web_configuration.temperature,
      target_browser_id,
      top_p: params.web_configuration.top_p,
      thinking_budget: params.web_configuration.thinking_budget,
      reasoning_effort: params.web_configuration.reasoning_effort,
      system_instructions: params.web_configuration.system_instructions,
      options: params.web_configuration.options,
      client_id: this.client_id || 0, // 0 is a temporary fallback and should be removed few weeks from 28.03.25
      raw_instructions: params.raw_instructions,
      prompt_type: params.prompt_type,
      reuse_last_tab
    }

    Logger.info({
      function_name: 'preview_web_configuration',
      message: 'Sending preview web configuration message',
      data: message
    })

    this.client?.send(JSON.stringify(message))
    return true
  }
}

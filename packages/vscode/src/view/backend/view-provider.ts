import * as vscode from 'vscode'
import * as path from 'path'
import { WebSocketManager } from '@/services/websocket-manager'
import {
  WebviewMessage,
  ExtensionMessage,
  PresetsMessage,
  TokenCountMessage,
  SelectionTextMessage,
  InstructionsMessage
} from '../types/messages'
import { WebsitesProvider } from '../../context/providers/websites-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors-provider'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { token_count_emitter } from '@/context/context-initialization'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import {
  handle_show_preset_picker,
  handle_copy_prompt,
  handle_send_prompt,
  handle_update_preset,
  handle_delete_preset,
  handle_duplicate_preset,
  handle_create_preset,
  handle_preview_preset,
  handle_show_quick_pick,
  handle_save_edit_format,
  handle_show_history_quick_pick,
  handle_save_presets_order,
  handle_get_selected_presets,
  handle_get_connection_status,
  handle_get_history,
  handle_save_history,
  handle_save_instructions,
  handle_get_instructions,
  handle_request_editor_state,
  handle_request_editor_selection_state,
  handle_edit_context,
  handle_code_completion,
  handle_get_edit_format,
  handle_at_sign_quick_pick,
  handle_get_mode_web,
  handle_save_mode_web,
  handle_get_mode_api,
  handle_save_mode_api,
  handle_save_home_view_type,
  handle_get_home_view_type,
  handle_get_version
} from './message-handlers'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/view/backend/helpers/preset-format-converters'
import { CHATBOTS } from '@shared/constants/chatbots'
import { HOME_VIEW_TYPES, HomeViewType } from '../types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'

export class ViewProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  public has_active_editor: boolean = false
  public has_active_selection: boolean = false
  public caret_position: number = 0
  public ask_instructions: string = ''
  public edit_instructions: string = ''
  public no_context_instructions: string = ''
  public code_completions_instructions: string = ''
  public web_mode: WebMode
  public chat_edit_format: EditFormat
  public api_edit_format: EditFormat
  public api_mode: ApiMode
  public home_view_type: HomeViewType = HOME_VIEW_TYPES.WEB

  public get_presets_config_key(): string {
    const mode =
      this.home_view_type === HOME_VIEW_TYPES.API
        ? this.api_mode
        : this.web_mode
    switch (mode) {
      case 'ask':
        return 'chatPresetsForAskAboutContext'
      case 'edit':
        return 'chatPresetsForEditContext'
      case 'code-completions':
        return 'chatPresetsForCodeAtCursor'
      case 'no-context':
        return 'chatPresetsForNoContext'
    }
  }

  public get_selected_presets_state_key(): string {
    return `selectedPresets.${this.web_mode}`
  }

  constructor(
    public readonly extension_uri: vscode.Uri,
    public readonly workspace_provider: WorkspaceProvider,
    public readonly open_editors_provider: OpenEditorsProvider,
    public readonly websites_provider: WebsitesProvider,
    public readonly context: vscode.ExtensionContext,
    public readonly websocket_server_instance: WebSocketManager
  ) {
    this.websocket_server_instance.on_connection_status_change((connected) => {
      if (this._webview_view) {
        this.send_message<ExtensionMessage>({
          command: 'CONNECTION_STATUS',
          connected
        })
      }
    })

    this.chat_edit_format = this.context.workspaceState.get<EditFormat>(
      'chat-edit-format',
      'whole'
    )
    this.api_edit_format = this.context.workspaceState.get<EditFormat>(
      'api-edit-format',
      'diff'
    )
    this.web_mode = this.context.workspaceState.get<WebMode>('web-mode', 'edit')
    this.api_mode = this.context.workspaceState.get<ApiMode>('api-mode', 'edit')
    this.home_view_type = HOME_VIEW_TYPES.WEB

    this._config_listener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (!this._webview_view) return
        const all_preset_keys = [
          'codeWebChat.chatPresetsForAskAboutContext',
          'codeWebChat.chatPresetsForEditContext',
          'codeWebChat.chatPresetsForCodeAtCursor',
          'codeWebChat.chatPresetsForNoContext'
        ]
        if (all_preset_keys.some((key) => event.affectsConfiguration(key))) {
          this.send_presets_to_webview(this._webview_view.webview)
        }
      }
    )

    token_count_emitter.on('token-count-updated', () => {
      if (this._webview_view) {
        this.calculate_token_count()
      }
    })

    this.context.subscriptions.push(this._config_listener)

    this.ask_instructions = this.context.workspaceState.get<string>(
      'ask-instructions',
      ''
    )
    this.edit_instructions = this.context.workspaceState.get<string>(
      'edit-instructions',
      ''
    )
    this.no_context_instructions = this.context.workspaceState.get<string>(
      'no-context-instructions',
      ''
    )
    this.code_completions_instructions =
      this.context.workspaceState.get<string>(
        'code-completions-instructions',
        ''
      )

    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor != this.has_active_editor) {
        this.has_active_editor = has_active_editor
        if (this._webview_view) {
          this.send_message<ExtensionMessage>({
            command: 'EDITOR_STATE_CHANGED',
            has_active_editor: has_active_editor
          })
        }
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_editor_state, 100)
    )
    update_editor_state()

    vscode.window.onDidChangeTextEditorSelection((event) => {
      const has_selection = !event.textEditor.selection.isEmpty
      if (has_selection != this.has_active_selection) {
        this.has_active_selection = has_selection
        if (this._webview_view) {
          this.send_message<ExtensionMessage>({
            command: 'EDITOR_SELECTION_CHANGED',
            has_selection: has_selection
          })
        }
      }
    })

    const update_selection_state = () => {
      const active_text_editor = vscode.window.activeTextEditor
      const has_selection = active_text_editor
        ? !active_text_editor.selection.isEmpty
        : false
      this.has_active_selection = has_selection
      if (this._webview_view) {
        this.send_message<ExtensionMessage>({
          command: 'EDITOR_SELECTION_CHANGED',
          has_selection: has_selection
        })
      }
    }

    const update_selection_text = () => {
      const active_text_editor = vscode.window.activeTextEditor
      if (active_text_editor && !active_text_editor.selection.isEmpty) {
        const selected_text = active_text_editor.document.getText(
          active_text_editor.selection
        )

        if (this._webview_view) {
          this.send_message<SelectionTextMessage>({
            command: 'SELECTION_TEXT_UPDATED',
            text: selected_text
          })
        }
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_selection_state, 100)
    )
    update_selection_state()

    vscode.window.onDidChangeTextEditorSelection(() =>
      setTimeout(update_selection_text, 100)
    )
    update_selection_text()

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document
      ) {
        if (
          (this.home_view_type == HOME_VIEW_TYPES.WEB &&
            this.web_mode == 'code-completions') ||
          (this.home_view_type == HOME_VIEW_TYPES.API &&
            this.api_mode == 'code-completions')
        ) {
          this.calculate_token_count()
        }
      }
    })
  }

  public calculate_token_count() {
    const active_editor = vscode.window.activeTextEditor

    const is_code_completions_mode =
      (this.home_view_type == HOME_VIEW_TYPES.WEB &&
        this.web_mode == 'code-completions') ||
      (this.home_view_type == HOME_VIEW_TYPES.API &&
        this.api_mode == 'code-completions')

    Promise.all([
      this.workspace_provider.get_checked_files_token_count({
        exclude_file_path:
          is_code_completions_mode && active_editor
            ? active_editor.document.uri.fsPath
            : undefined
      }),
      this.websites_provider.get_checked_websites_token_count()
    ])
      .then(([workspace_tokens, websites_tokens]) => {
        let current_token_count = workspace_tokens + websites_tokens

        if (active_editor && is_code_completions_mode) {
          const document = active_editor.document
          const text = document.getText()
          const file_path = document.uri.fsPath
          const workspace_root =
            this.workspace_provider.get_workspace_root_for_file(file_path)
          let content_xml = ''

          if (!workspace_root) {
            content_xml = `<file path="${file_path}">\n<![CDATA[\n${text}\n]]>\n</file>\n`
          } else {
            const relative_path = path.relative(workspace_root, file_path)
            if (this.workspace_provider.getWorkspaceRoots().length > 1) {
              const workspace_name =
                this.workspace_provider.get_workspace_name(workspace_root)
              content_xml = `<file path="${workspace_name}/${relative_path}">\n<![CDATA[\n${text}\n]]>\n</file>\n`
            } else {
              content_xml = `<file path="${relative_path}">\n<![CDATA[\n${text}\n]]>\n</file>\n`
            }
          }
          const file_token_count = Math.floor(content_xml.length / 4)
          current_token_count += file_token_count
        }

        this.send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          token_count: current_token_count
        })
      })
      .catch((error) => {
        console.error('Error calculating token count:', error)
        vscode.window.showErrorMessage(
          `Error calculating token count: ${error.message}`
        )
        this.send_message<TokenCountMessage>({
          command: 'TOKEN_COUNT_UPDATED',
          token_count: 0
        })
      })
  }

  public send_message<T>(message: T) {
    if (this._webview_view) {
      this._webview_view.webview.postMessage(message)
    }
  }

  async resolveWebviewView(
    webview_view: vscode.WebviewView,
    _: vscode.WebviewViewResolveContext,
    __: vscode.CancellationToken
  ) {
    this._webview_view = webview_view

    webview_view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extension_uri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)

    webview_view.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          if (message.command == 'GET_HISTORY') {
            handle_get_history(this)
          } else if (message.command == 'SAVE_HISTORY') {
            await handle_save_history(this, message)
          } else if (message.command == 'GET_INSTRUCTIONS') {
            handle_get_instructions(this)
          } else if (message.command == 'SAVE_INSTRUCTIONS') {
            await handle_save_instructions(this, message)
          } else if (message.command == 'GET_CONNECTION_STATUS') {
            handle_get_connection_status(this)
          } else if (message.command == 'GET_PRESETS') {
            this.send_presets_to_webview(webview_view.webview)
          } else if (message.command == 'GET_SELECTED_PRESETS') {
            handle_get_selected_presets(this)
          } else if (message.command == 'SAVE_SELECTED_PRESETS') {
            const state_key = this.get_selected_presets_state_key()
            await this.context.globalState.update(state_key, message.names)
          } else if (message.command == 'SEND_PROMPT') {
            await handle_send_prompt(this, message.preset_names)
          } else if (message.command == 'PREVIEW_PRESET') {
            await handle_preview_preset(this, message)
          } else if (message.command == 'COPY_PROMPT') {
            await handle_copy_prompt(
              this,
              message.instruction,
              message.preset_name
            )
          } else if (message.command == 'SHOW_PRESET_PICKER') {
            await handle_show_preset_picker(this)
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            handle_request_editor_state(this)
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            handle_request_editor_selection_state(this)
          } else if (message.command == 'GET_CURRENT_TOKEN_COUNT') {
            this.calculate_token_count()
          } else if (message.command == 'SAVE_PRESETS_ORDER') {
            await handle_save_presets_order(this, message)
          } else if (message.command == 'UPDATE_PRESET') {
            await handle_update_preset(this, message, webview_view)
          } else if (message.command == 'DELETE_PRESET') {
            await handle_delete_preset(this, message, webview_view)
          } else if (message.command == 'DUPLICATE_PRESET') {
            await handle_duplicate_preset(this, message, webview_view)
          } else if (message.command == 'CREATE_PRESET') {
            await handle_create_preset(this)
          } else if (message.command == 'EXECUTE_COMMAND') {
            vscode.commands.executeCommand(message.command_id)
          } else if (message.command == 'EDIT_CONTEXT') {
            await handle_edit_context(this, message)
          } else if (message.command == 'CODE_COMPLETION') {
            await handle_code_completion(this, message)
          } else if (message.command == 'SHOW_HISTORY_QUICK_PICK') {
            await handle_show_history_quick_pick(this)
          } else if (message.command == 'SHOW_QUICK_PICK') {
            await handle_show_quick_pick(message)
          } else if (message.command == 'GET_WEB_MODE') {
            handle_get_mode_web(this)
          } else if (message.command == 'SAVE_WEB_MODE') {
            await handle_save_mode_web(this, message.mode)
          } else if (message.command == 'GET_API_MODE') {
            handle_get_mode_api(this)
          } else if (message.command == 'SAVE_API_MODE') {
            await handle_save_mode_api(this, message.mode)
          } else if (message.command == 'GET_EDIT_FORMAT') {
            handle_get_edit_format(this)
          } else if (message.command == 'SAVE_EDIT_FORMAT') {
            await handle_save_edit_format(this, message)
          } else if (message.command == 'CARET_POSITION_CHANGED') {
            this.caret_position = message.caret_position
          } else if (message.command == 'SAVE_HOME_VIEW_TYPE') {
            await handle_save_home_view_type(this, message)
          } else if (message.command == 'GET_HOME_VIEW_TYPE') {
            handle_get_home_view_type(this)
          } else if (message.command == 'GET_VERSION') {
            handle_get_version(this)
          } else if (message.command == 'SHOW_AT_SIGN_QUICK_PICK') {
            await handle_at_sign_quick_pick(this, this.context)
          }
        } catch (error: any) {
          console.error('Error handling message:', message, error)
          vscode.window.showErrorMessage(
            `Error handling message: ${error.message}`
          )
        }
      }
    )

    this.send_presets_to_webview(webview_view.webview)
  }

  public send_presets_to_webview(_: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_modes: WebMode[] = [
      'ask',
      'edit',
      'code-completions',
      'no-context'
    ]
    const mode_to_config_key: Record<WebMode, string> = {
      ask: 'chatPresetsForAskAboutContext',
      edit: 'chatPresetsForEditContext',
      'code-completions': 'chatPresetsForCodeAtCursor',
      'no-context': 'chatPresetsForNoContext'
    }
    const all_presets = Object.fromEntries(
      web_modes.map((mode) => {
        const presets_config_key = mode_to_config_key[mode]
        const presets_config =
          config.get<ConfigPresetFormat[]>(presets_config_key, []) || []
        const presets_ui = presets_config
          .filter((preset_config) => CHATBOTS[preset_config.chatbot])
          .map((preset_config) => config_preset_to_ui_format(preset_config))
        return [mode, presets_ui]
      })
    ) as { [T in WebMode]: Preset[] }
    this.send_message<PresetsMessage>({
      command: 'PRESETS',
      presets: all_presets
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    const resources_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extension_uri, 'resources')
    )

    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extension_uri, 'out', 'view.js')
    )

    const style_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extension_uri, 'out', 'view.css')
    )

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${style_uri}">
        <script>
          window.resources_uri = "${resources_uri}";
        </script>
        <style>
          body { overflow: hidden; }
          .simplebar-scrollbar::before { background-color: var(--vscode-scrollbarSlider-background); width: 10px!important; border-radius: 0!important;  top: 0!important; right: 0!important; bottom: 0!important; left: 0!important; }
          [data-simplebar]:hover .simplebar-scrollbar::before { opacity: 1!important }
          .simplebar-track.simplebar-vertical { width: 10px; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script src="${script_uri}"></script>
      </body>
      </html>
    `
  }

  public add_text_at_cursor_position(text: string) {
    const is_in_code_completions_mode =
      (this.home_view_type == HOME_VIEW_TYPES.WEB &&
        this.web_mode == 'code-completions') ||
      (this.home_view_type == HOME_VIEW_TYPES.API &&
        this.api_mode == 'code-completions')

    let current_instructions = ''
    let new_instructions = ''
    let instruction_key = ''
    const mode: WebMode | ApiMode = is_in_code_completions_mode
      ? 'code-completions'
      : this.home_view_type === HOME_VIEW_TYPES.WEB
      ? this.web_mode
      : this.api_mode

    switch (mode) {
      case 'ask':
        current_instructions = this.ask_instructions
        break
      case 'edit':
        current_instructions = this.edit_instructions
        break
      case 'no-context':
        current_instructions = this.no_context_instructions
        break
      case 'code-completions':
        current_instructions = this.code_completions_instructions
        break
      default:
        return
    }

    const before_caret = current_instructions.slice(0, this.caret_position)
    const after_caret = current_instructions.slice(this.caret_position)
    new_instructions = before_caret + text + after_caret
    instruction_key = `${mode}-instructions`

    switch (mode) {
      case 'ask':
        this.ask_instructions = new_instructions
        break
      case 'edit':
        this.edit_instructions = new_instructions
        break
      case 'no-context':
        this.no_context_instructions = new_instructions
        break
      case 'code-completions':
        this.code_completions_instructions = new_instructions
        break
    }

    this.caret_position += text.length

    this.context.workspaceState.update(instruction_key, new_instructions)
    this.send_message<InstructionsMessage>({
      command: 'INSTRUCTIONS',
      ask: this.ask_instructions,
      edit: this.edit_instructions,
      no_context: this.no_context_instructions,
      code_completions: this.code_completions_instructions
    })
  }
}

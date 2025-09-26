import * as vscode from 'vscode'
import * as path from 'path'
import { WebSocketManager } from '@/services/websocket-manager'
import { FrontendMessage, BackendMessage } from '../types/messages'
import { parse_response } from '@/commands/apply-chat-response-command/utils/clipboard-parser/clipboard-parser'
import { WebsitesProvider } from '@/context/providers/websites-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors-provider'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { token_count_emitter } from '@/context/context-initialization'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import {
  handle_copy_prompt,
  handle_send_prompt,
  handle_update_preset,
  handle_delete_preset,
  handle_duplicate_preset,
  handle_create_preset,
  handle_preview_preset,
  handle_save_edit_format,
  handle_show_history_quick_pick,
  handle_replace_presets,
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
  handle_get_home_view_type,
  handle_get_version,
  handle_show_prompt_template_quick_pick,
  handle_at_sign_quick_pick_for_preset_affix,
  handle_get_api_tool_configurations,
  handle_pick_open_router_model,
  handle_pick_chatbot,
  handle_get_donations_visibility,
  handle_save_donations_visibility,
  handle_focus_on_file_in_review,
  handle_go_to_file_in_review,
  handle_toggle_file_in_review,
  handle_intelligent_update_file_in_review
} from './message-handlers'
import {
  API_EDIT_FORMAT_STATE_KEY,
  API_MODE_STATE_KEY,
  CHAT_EDIT_FORMAT_STATE_KEY,
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY,
  INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
  INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
  get_last_group_or_preset_choice_state_key,
  get_last_selected_group_state_key,
  get_last_selected_preset_key,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
  LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY,
  LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY,
  RECENT_DONATIONS_VISIBLE_STATE_KEY,
  WEB_MODE_STATE_KEY
} from '@/constants/state-keys'
import { can_undo } from '@/commands/undo-command'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/panel/backend/utils/preset-format-converters'
import { CHATBOTS } from '@shared/constants/chatbots'
import { HOME_VIEW_TYPES, HomeViewType } from '../types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { api_tool_config_emitter } from '@/services/model-providers-manager'
import { code_review_promise_resolve } from '@/commands/apply-chat-response-command/utils/review'
import { Logger } from '@shared/utils/logger'
import { CancelTokenSource } from 'axios'
import { update_last_used_preset_or_group } from './message-handlers/update-last-used-preset-or-group'
import { dictionary } from '@shared/constants/dictionary'

export class ViewProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  public has_active_editor: boolean = false
  public has_active_selection: boolean = false
  public caret_position: number = 0
  public ask_instructions: string = ''
  public edit_instructions: string = ''
  public no_context_instructions: string = ''
  public code_completion_instructions: string = ''
  public web_mode: WebMode
  public chat_edit_format: EditFormat
  public api_edit_format: EditFormat
  public api_mode: ApiMode
  public home_view_type: HomeViewType = HOME_VIEW_TYPES.WEB
  public intelligent_update_cancel_token_sources: CancelTokenSource[] = []
  public api_call_cancel_token_source: CancelTokenSource | null = null

  public get_presets_config_key(): string {
    const mode =
      this.home_view_type == HOME_VIEW_TYPES.API ? this.api_mode : this.web_mode
    switch (mode) {
      case 'ask':
        return 'chatPresetsForAskAboutContext'
      case 'edit-context':
        return 'chatPresetsForEditContext'
      case 'code-completions':
        return 'chatPresetsForCodeAtCursor'
      case 'no-context':
        return 'chatPresetsForNoContext'
    }
  }

  public cancel_all_intelligent_updates() {
    this.intelligent_update_cancel_token_sources.forEach((source) =>
      source.cancel('Review finished.')
    )
    this.intelligent_update_cancel_token_sources = []
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
        this.send_message({
          command: 'CONNECTION_STATUS',
          connected
        })
      }
    })

    this.edit_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
      ''
    )
    this.ask_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_ASK_STATE_KEY,
      ''
    )
    this.no_context_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
      ''
    )
    this.code_completion_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY,
      ''
    )

    api_tool_config_emitter.on('api-tools-updated', () => {
      if (this._webview_view) {
        void handle_get_api_tool_configurations(this)
      }
    })

    this.chat_edit_format = this.context.workspaceState.get<EditFormat>(
      CHAT_EDIT_FORMAT_STATE_KEY,
      'whole'
    )
    this.api_edit_format = this.context.workspaceState.get<EditFormat>(
      API_EDIT_FORMAT_STATE_KEY,
      'diff'
    )

    this.web_mode = this.context.workspaceState.get<WebMode>(
      WEB_MODE_STATE_KEY,
      'edit-context'
    )
    this.api_mode = this.context.workspaceState.get<ApiMode>(
      API_MODE_STATE_KEY,
      'edit-context'
    )

    vscode.window.onDidChangeWindowState(async (e) => {
      if (e.focused) {
        await this._check_clipboard_for_apply()
        const are_donations_visible = this.context.globalState.get<boolean>(
          RECENT_DONATIONS_VISIBLE_STATE_KEY,
          false
        )
        this.send_message({
          command: 'DONATIONS_VISIBILITY',
          is_visible: are_donations_visible
        })
      }
    })

    this._watch_git_state()

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

    const update_editor_state = () => {
      const has_active_editor = !!vscode.window.activeTextEditor
      if (has_active_editor != this.has_active_editor) {
        this.has_active_editor = has_active_editor
        if (this._webview_view) {
          this.send_message({
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
          this.send_message({
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
        this.send_message({
          command: 'EDITOR_SELECTION_CHANGED',
          has_selection: has_selection
        })
      }
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_selection_state, 100)
    )
    update_selection_state()

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

  private async _check_clipboard_for_apply() {
    if (!this._webview_view) return

    const clipboard_text = await vscode.env.clipboard.readText()

    const last_applied_content = this.context.workspaceState.get<string>(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
    )

    if (
      clipboard_text.trim() &&
      last_applied_content &&
      clipboard_text === last_applied_content
    ) {
      this.send_message({
        command: 'CAN_APPLY_CLIPBOARD_CHANGED',
        can_apply: false
      })
      return
    }

    if (!clipboard_text.trim()) {
      this.send_message({
        command: 'CAN_APPLY_CLIPBOARD_CHANGED',
        can_apply: false
      })
      return
    }

    const content = parse_response(clipboard_text)

    const can_apply =
      content.code_completion != null ||
      (content.patches && content.patches.length > 0) ||
      (content.files && content.files.length > 0) ||
      false

    this.send_message({ command: 'CAN_APPLY_CLIPBOARD_CHANGED', can_apply })
  }

  public send_message(message: BackendMessage) {
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
      async (message: FrontendMessage) => {
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
          } else if (message.command == 'SEND_PROMPT') {
            await handle_send_prompt({
              provider: this,
              preset_name: message.preset_name,
              group_name: message.group_name,
              show_quick_pick: message.show_quick_pick,
              without_submission: message.without_submission
            })
          } else if (message.command == 'PREVIEW_PRESET') {
            await handle_preview_preset(this, message)
          } else if (message.command == 'COPY_PROMPT') {
            await handle_copy_prompt({
              provider: this,
              instructions: message.instructions,
              preset_name: message.preset_name
            })
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            handle_request_editor_state(this)
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            handle_request_editor_selection_state(this)
          } else if (message.command == 'GET_CURRENT_TOKEN_COUNT') {
            this.calculate_token_count()
          } else if (message.command == 'REPLACE_PRESETS') {
            await handle_replace_presets(this, message)
          } else if (message.command == 'UPDATE_PRESET') {
            await handle_update_preset(this, message, webview_view)
          } else if (message.command == 'DELETE_PRESET') {
            await handle_delete_preset(this, message, webview_view)
          } else if (message.command == 'DUPLICATE_PRESET') {
            await handle_duplicate_preset(this, message, webview_view)
          } else if (message.command == 'CREATE_PRESET') {
            await handle_create_preset(this)
          } else if (message.command == 'EXECUTE_COMMAND') {
            await vscode.commands.executeCommand(message.command_id)
          } else if (message.command == 'EDIT_CONTEXT') {
            await handle_edit_context(this, message)
          } else if (message.command == 'CODE_COMPLETION') {
            await handle_code_completion(this, message)
          } else if (message.command == 'SHOW_HISTORY_QUICK_PICK') {
            await handle_show_history_quick_pick(this)
          } else if (message.command == 'SHOW_PROMPT_TEMPLATE_QUICK_PICK') {
            await handle_show_prompt_template_quick_pick(this)
          } else if (message.command == 'GET_WEB_MODE') {
            handle_get_mode_web(this)
          } else if (message.command == 'CANCEL_API_REQUEST') {
            if (this.api_call_cancel_token_source) {
              this.api_call_cancel_token_source.cancel('Cancelled by user.')
              this.api_call_cancel_token_source = null
            }
          } else if (message.command == 'GET_API_TOOL_CONFIGURATIONS') {
            await handle_get_api_tool_configurations(this)
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
            this.home_view_type = message.view_type
            this.calculate_token_count()
          } else if (message.command == 'GET_HOME_VIEW_TYPE') {
            handle_get_home_view_type(this)
          } else if (message.command == 'GET_VERSION') {
            handle_get_version(this)
          } else if (message.command == 'SHOW_AT_SIGN_QUICK_PICK') {
            await handle_at_sign_quick_pick(
              this,
              this.context,
              message.is_for_code_completions
            )
          } else if (
            message.command == 'SHOW_AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX'
          ) {
            await handle_at_sign_quick_pick_for_preset_affix(
              this,
              this.context,
              message
            )
          } else if (message.command == 'CHECK_CLIPBOARD_FOR_APPLY') {
            await this._check_clipboard_for_apply()
          } else if (message.command == 'GET_DONATIONS_VISIBILITY') {
            handle_get_donations_visibility(this)
          } else if (message.command == 'SAVE_DONATIONS_VISIBILITY') {
            await handle_save_donations_visibility(this, message)
          } else if (message.command == 'FOCUS_ON_FILE_IN_REVIEW') {
            handle_focus_on_file_in_review(this, message)
          } else if (message.command == 'GO_TO_FILE_IN_REVIEW') {
            handle_go_to_file_in_review(this, message)
          } else if (message.command == 'TOGGLE_FILE_IN_REVIEW') {
            await handle_toggle_file_in_review(this, message)
          } else if (message.command == 'INTELLIGENT_UPDATE_FILE_IN_REVIEW') {
            await handle_intelligent_update_file_in_review(this, message)
          } else if (message.command == 'EDITS_REVIEW') {
            if (code_review_promise_resolve) {
              code_review_promise_resolve({ accepted_files: message.files })
            }
          } else if (message.command == 'GET_WORKSPACE_STATE') {
            this.send_message({
              command: 'WORKSPACE_STATE',
              folder_count: this.workspace_provider.getWorkspaceRoots().length
            })
          } else if (message.command == 'PICK_OPEN_ROUTER_MODEL') {
            await handle_pick_open_router_model(this)
          } else if (message.command == 'PICK_CHATBOT') {
            await handle_pick_chatbot(this, message)
          } else if (message.command == 'UPDATE_LAST_USED_PRESET') {
            update_last_used_preset_or_group({
              provider: this,
              preset_name: message.preset_name
            })
          } else if (message.command == 'REQUEST_GIT_STATE') {
            this._send_git_state()
          }
        } catch (error: any) {
          Logger.error({
            function_name: 'resolveWebviewView',
            message: 'Error handling message',
            data: { message, error }
          })
          vscode.window.showErrorMessage(
            dictionary.error_message.ERROR_HANDLING_MESSAGE(error.message)
          )
        }
      }
    )

    this.send_presets_to_webview(webview_view.webview)
    // We need to wait until the webview fully initialized
    setTimeout(() => {
      this.send_message({
        command: 'CAN_UNDO_CHANGED',
        can_undo: can_undo(this.context)
      })
    }, 1000)
  }

  public calculate_token_count() {
    if (
      this.home_view_type == HOME_VIEW_TYPES.WEB &&
      this.web_mode == 'no-context'
    ) {
      this.send_message({
        command: 'TOKEN_COUNT_UPDATED',
        token_count: 0
      })
      return
    }

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

        this.send_message({
          command: 'TOKEN_COUNT_UPDATED',
          token_count: current_token_count
        })
      })
      .catch((error) => {
        Logger.error({
          function_name: 'calculate_token_count',
          message: 'Error calculating token count',
          data: error
        })
        vscode.window.showErrorMessage(
          dictionary.error_message.ERROR_CALCULATING_TOKEN_COUNT(error.message)
        )
        this.send_message({
          command: 'TOKEN_COUNT_UPDATED',
          token_count: 0
        })
      })
  }

  public send_presets_to_webview(_: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_modes: WebMode[] = [
      'ask',
      'edit-context',
      'code-completions',
      'no-context'
    ]
    const mode_to_config_key: Record<WebMode, string> = {
      ask: 'chatPresetsForAskAboutContext',
      'edit-context': 'chatPresetsForEditContext',
      'code-completions': 'chatPresetsForCodeAtCursor',
      'no-context': 'chatPresetsForNoContext'
    }
    const all_presets = Object.fromEntries(
      web_modes.map((mode) => {
        const presets_config_key = mode_to_config_key[mode]
        const presets_config =
          config.get<ConfigPresetFormat[]>(presets_config_key, []) || []
        const presets_ui = presets_config
          .filter(
            (preset_config) =>
              !preset_config.chatbot || CHATBOTS[preset_config.chatbot]
          )
          .map((preset_config) => config_preset_to_ui_format(preset_config))
        return [mode, presets_ui]
      })
    ) as { [T in WebMode]: Preset[] }
    this.send_message({
      command: 'PRESETS',
      presets: all_presets,
      selected_preset_or_group_name_by_mode: Object.fromEntries(
        web_modes.map((mode) => {
          const presets_for_mode = all_presets[mode]
          let selected_name: string | undefined = undefined
          const last_choice = this.context.workspaceState.get<string>(
            get_last_group_or_preset_choice_state_key(mode)
          )
          if (last_choice === 'Preset') {
            const last_preset = this.context.workspaceState.get<string>(
              get_last_selected_preset_key(mode)
            )
            if (
              last_preset &&
              presets_for_mode.some((p) => p.chatbot && p.name === last_preset)
            ) {
              selected_name = last_preset
            }
          } else if (last_choice === 'Group') {
            const last_group = this.context.workspaceState.get<string>(
              get_last_selected_group_state_key(mode)
            )
            if (last_group) {
              if (last_group === 'Ungrouped') {
                const first_group_index = presets_for_mode.findIndex(
                  (p) => !p.chatbot
                )
                if (
                  first_group_index > 0 ||
                  (first_group_index === -1 && presets_for_mode.length > 0)
                ) {
                  selected_name = last_group
                }
              } else if (
                presets_for_mode.some(
                  (p) => !p.chatbot && p.name === last_group
                )
              ) {
                selected_name = last_group
              }
            }
          }
          return [mode, selected_name]
        })
      ),
      selected_configuration_index_by_mode: {
        'edit-context': this.context.workspaceState.get<number>(
          LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY
        ),
        'code-completions': this.context.workspaceState.get<number>(
          LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY,
          0
        )
      }
    })
  }

  private _send_git_state() {
    try {
      const git_extension =
        vscode.extensions.getExtension('vscode.git')?.exports
      if (!git_extension) {
        return
      }
      const git = git_extension.getAPI(1)
      if (!git) {
        return
      }
      const has_changes = git.repositories.some(
        (repo: any) =>
          repo.state.workingTreeChanges.length > 0 ||
          repo.state.indexChanges.length > 0
      )
      this.send_message({
        command: 'GIT_STATE_CHANGED',
        has_changes_to_commit: has_changes
      })
    } catch (error) {
      Logger.warn({
        function_name: '_send_git_state',
        message: 'Failed to get git state',
        data: error
      })
    }
  }

  private _watch_git_state() {
    try {
      const git_extension =
        vscode.extensions.getExtension('vscode.git')?.exports
      if (!git_extension) {
        throw new Error('Git extension not found or not yet active.')
      }
      const git = git_extension.getAPI(1)
      if (!git) {
        throw new Error('Git API not available yet.')
      }

      for (const repo of git.repositories) {
        repo.state.onDidChange(
          this._send_git_state,
          this,
          this.context.subscriptions
        )
      }

      git.onDidOpenRepository(
        (repo: any) => {
          repo.state.onDidChange(
            this._send_git_state,
            this,
            this.context.subscriptions
          )
          this._send_git_state()
        },
        this,
        this.context.subscriptions
      )
    } catch (error) {
      Logger.warn({
        function_name: '_watch_git_state',
        message: 'Failed to initialize git watcher, will retry in 1s',
        data: error
      })
      setTimeout(() => this._watch_git_state(), 1000)
    }
  }

  public set_apply_button_state = (can_apply: boolean) => {
    this.send_message({
      command: 'CAN_APPLY_CLIPBOARD_CHANGED',
      can_apply: can_apply
    })
  }

  public set_undo_button_state = (can_undo: boolean) => {
    this.send_message({
      command: 'CAN_UNDO_CHANGED',
      can_undo: can_undo
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

  public add_text_at_cursor_position(text: string, chars_to_remove_before = 0) {
    const is_in_code_completions_mode =
      (this.home_view_type == HOME_VIEW_TYPES.WEB &&
        this.web_mode == 'code-completions') ||
      (this.home_view_type == HOME_VIEW_TYPES.API &&
        this.api_mode == 'code-completions')

    let current_instructions = ''
    let new_instructions = ''
    const mode: WebMode | ApiMode = is_in_code_completions_mode
      ? 'code-completions'
      : this.home_view_type == HOME_VIEW_TYPES.WEB
      ? this.web_mode
      : this.api_mode

    switch (mode) {
      case 'ask':
        current_instructions = this.ask_instructions
        break
      case 'edit-context':
        current_instructions = this.edit_instructions
        break
      case 'no-context':
        current_instructions = this.no_context_instructions
        break
      case 'code-completions':
        current_instructions = this.code_completion_instructions
        break
      default:
        return
    }

    const before_caret = current_instructions.slice(
      0,
      this.caret_position - chars_to_remove_before
    )
    const after_caret = current_instructions.slice(this.caret_position)

    new_instructions = (before_caret + text + after_caret).replace(/  +/g, ' ')
    const new_caret_position = (before_caret + text).replace(/  +/g, ' ').length

    new_instructions = new_instructions.replace(/  +/g, ' ')

    switch (mode) {
      case 'ask':
        this.ask_instructions = new_instructions
        break
      case 'edit-context':
        this.edit_instructions = new_instructions
        break
      case 'no-context':
        this.no_context_instructions = new_instructions
        break
      case 'code-completions':
        this.code_completion_instructions = new_instructions
        break
    }

    this.caret_position = new_caret_position

    this.send_message({
      command: 'INSTRUCTIONS',
      ask: this.ask_instructions,
      edit_context: this.edit_instructions,
      no_context: this.no_context_instructions,
      code_completions: this.code_completion_instructions,
      caret_position: this.caret_position
    })
  }
}

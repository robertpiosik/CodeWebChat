import * as vscode from 'vscode'
import * as path from 'path'
import { WebSocketManager } from '@/services/websocket-manager'
import { FrontendMessage, BackendMessage } from '../types/messages'
import { ApiManager } from '@/services/api-manager'
import { WebsitesProvider } from '@/context/providers/websites/websites-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { token_count_emitter } from '@/context/context-initialization'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import {
  get_checkpoints,
  toggle_checkpoint_star,
  restore_checkpoint,
  update_checkpoint_description
} from '@/commands/checkpoints-command/actions'
import {
  handle_copy_prompt,
  handle_send_to_browser,
  handle_update_preset,
  handle_delete_preset_group_or_separator,
  handle_create_checkpoint,
  handle_clear_all_checkpoints,
  handle_duplicate_preset_group_or_separator,
  handle_create_preset_group_or_separator,
  handle_preview_preset,
  handle_save_edit_format,
  handle_replace_presets,
  handle_get_connection_status,
  handle_get_history,
  handle_apply_response_from_history,
  handle_save_history,
  handle_save_instructions,
  handle_get_instructions,
  handle_request_editor_state,
  handle_request_editor_selection_state,
  handle_edit_context,
  handle_code_completion,
  handle_get_edit_format,
  handle_get_edit_format_instructions,
  handle_at_sign_quick_pick,
  handle_get_web_prompt_type,
  handle_save_web_prompt_type,
  handle_save_mode,
  handle_get_api_prompt_type,
  handle_save_api_prompt_type,
  handle_get_mode,
  handle_get_workspace_state,
  handle_get_version,
  handle_show_prompt_template_quick_pick,
  handle_get_api_tool_configurations,
  handle_reorder_api_tool_configurations,
  handle_toggle_pinned_api_tool_configuration,
  handle_pick_open_router_model,
  handle_pick_chatbot,
  handle_focus_on_file_in_preview,
  handle_go_to_file,
  handle_show_diff,
  handle_toggle_file_in_preview,
  handle_discard_user_changes_in_preview,
  handle_intelligent_update_file_in_preview,
  handle_response_preview,
  handle_get_collapsed_states,
  handle_manage_configurations,
  handle_save_component_collapsed_state,
  handle_undo,
  handle_delete_checkpoint,
  handle_request_can_undo,
  handle_preview_generated_code,
  handle_get_tasks,
  handle_save_tasks,
  handle_delete_task,
  handle_fix_all_failed_files,
  handle_prune_context,
  handle_cancel_intelligent_update_file_in_preview,
  handle_get_prune_context_instructions_prefix,
  handle_save_prune_context_instructions_prefix,
  handle_open_external_url,
  handle_hash_sign_quick_pick,
  handle_open_file_and_select,
  handle_save_prompt_image,
  handle_open_prompt_image,
  handle_save_prompt_document,
  handle_open_prompt_document,
  handle_paste_url
} from './message-handlers'
import { SelectionState } from '../types/messages'
import {
  API_EDIT_FORMAT_STATE_KEY,
  API_MODE_STATE_KEY,
  CHAT_EDIT_FORMAT_STATE_KEY,
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_CODE_AT_CURSOR_STATE_KEY,
  INSTRUCTIONS_PRUNE_CONTEXT_STATE_KEY,
  INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
  INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
  PANEL_MODE_STATE_KEY,
  WEB_MODE_STATE_KEY,
  RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY,
  RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY,
  RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY,
  get_recently_used_presets_or_groups_key
} from '@/constants/state-keys'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/panel/backend/utils/preset-format-converters'
import { CHATBOTS } from '@shared/constants/chatbots'
import { MODE, Mode } from '../types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { Logger } from '@shared/utils/logger'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { CancelTokenSource } from 'axios'
import { update_last_used_preset_or_group } from './message-handlers/update-last-used-preset-or-group'
import { dictionary } from '@shared/constants/dictionary'
import { DEFAULT_CONTEXT_SIZE_WARNING_THRESHOLD } from '@/constants/values'
import { upsert_configuration } from '../../utils/upsert-configuration'
import { delete_configuration } from '../../utils/delete-configuration'

export class PanelProvider implements vscode.WebviewViewProvider {
  private _webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  public currently_open_file_path?: string
  public current_selection: SelectionState | null = null
  public caret_position: number = 0
  public ask_about_context_instructions: string = ''
  public edit_context_instructions: string = ''
  public no_context_instructions: string = ''
  public code_at_cursor_instructions: string = ''
  public prune_context_instructions: string = ''
  public web_prompt_type: WebPromptType
  public chat_edit_format: EditFormat
  public api_edit_format: EditFormat
  public api_prompt_type: ApiPromptType
  public mode: Mode = MODE.WEB
  public intelligent_update_cancel_token_sources: {
    source: CancelTokenSource
    file_path: string
    workspace_name?: string
  }[] = []
  public api_call_cancel_token_source: CancelTokenSource | null = null
  public api_manager!: ApiManager
  public response_history: ResponseHistoryItem[] = []
  public active_checkpoint_delete_operation: {
    finalize: () => Promise<void>
    timestamp: number
  } | null = null

  public preview_switch_choice_resolver:
    | ((choice: 'Switch' | undefined) => void)
    | undefined = undefined

  public set_api_manager(api_manager: ApiManager) {
    this.api_manager = api_manager
  }

  private _update_providers_compact_mode() {
    const is_prune_context =
      (this.mode == MODE.WEB && this.web_prompt_type == 'prune-context') ||
      (this.mode == MODE.API && this.api_prompt_type == 'prune-context')
    this.workspace_provider.set_use_compact_token_count(is_prune_context)
    this.open_editors_provider.set_use_compact_token_count(is_prune_context)
  }

  public async send_checkpoints() {
    const checkpoints = await get_checkpoints(this.context)
    this.send_message({
      command: 'CHECKPOINTS',
      checkpoints: checkpoints.map((c) => ({
        timestamp: c.timestamp,
        title: c.title,
        description: c.description,
        is_starred: c.is_starred
      }))
    })
  }

  private _send_send_with_shift_enter() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const enabled = config.get<boolean>('sendWithShiftEnter', false)
    this.send_message({
      command: 'SEND_WITH_SHIFT_ENTER',
      enabled
    })
  }

  public send_currently_open_file_text() {
    const active_editor = vscode.window.activeTextEditor
    this.send_message({
      command: 'CURRENTLY_OPEN_FILE_TEXT',
      text: active_editor ? active_editor.document.getText() : undefined
    })
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

    this.edit_context_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
      ''
    )
    this.ask_about_context_instructions =
      this.context.workspaceState.get<string>(INSTRUCTIONS_ASK_STATE_KEY, '')
    this.no_context_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
      ''
    )
    this.code_at_cursor_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_CODE_AT_CURSOR_STATE_KEY,
      ''
    )
    this.prune_context_instructions = this.context.workspaceState.get<string>(
      INSTRUCTIONS_PRUNE_CONTEXT_STATE_KEY,
      ''
    )

    this.chat_edit_format =
      this.context.workspaceState.get<EditFormat>(CHAT_EDIT_FORMAT_STATE_KEY) ??
      this.context.globalState.get<EditFormat>(CHAT_EDIT_FORMAT_STATE_KEY) ??
      'whole'
    this.api_edit_format =
      this.context.workspaceState.get<EditFormat>(API_EDIT_FORMAT_STATE_KEY) ??
      this.context.globalState.get<EditFormat>(API_EDIT_FORMAT_STATE_KEY) ??
      'whole'
    this.mode =
      this.context.workspaceState.get<Mode>(PANEL_MODE_STATE_KEY) ??
      this.context.globalState.get<Mode>(PANEL_MODE_STATE_KEY) ??
      MODE.WEB

    this.web_prompt_type = this.context.workspaceState.get<WebPromptType>(
      WEB_MODE_STATE_KEY,
      'edit-context'
    )
    this.api_prompt_type = this.context.workspaceState.get<ApiPromptType>(
      API_MODE_STATE_KEY,
      'edit-context'
    )

    this._update_providers_compact_mode()

    vscode.window.onDidChangeWindowState(async (e) => {
      if (e.focused) {
        this.send_message({
          command: 'RESET_APPLY_BUTTON_TEMPORARY_DISABLED_STATE'
        })
      }
    })

    this.context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        handle_get_tasks(this)
        handle_get_workspace_state(this)
        this.send_context_files()
      })
    )

    this._config_listener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (!this._webview_view) return
        const all_preset_keys = [
          'codeWebChat.chatPresetsForAskAboutContext',
          'codeWebChat.chatPresetsForEditContext',
          'codeWebChat.chatPresetsForCodeAtCursor',
          'codeWebChat.chatPresetsForPruneContext',
          'codeWebChat.chatPresetsForNoContext'
        ]
        if (all_preset_keys.some((key) => event.affectsConfiguration(key))) {
          this.send_presets_to_webview(this._webview_view.webview)
        }

        if (
          event.affectsConfiguration(
            'codeWebChat.editFormatInstructionsWhole'
          ) ||
          event.affectsConfiguration(
            'codeWebChat.editFormatInstructionsTruncated'
          ) ||
          event.affectsConfiguration('codeWebChat.editFormatInstructionsDiff')
        ) {
          handle_get_edit_format_instructions(this)
        }

        if (
          event.affectsConfiguration('codeWebChat.contextSizeWarningThreshold')
        ) {
          this._send_context_size_warning_threshold()
        }

        const all_api_config_keys = [
          'codeWebChat.configurationsForEditContext',
          'codeWebChat.configurationsForCodeAtCursor',
          'codeWebChat.configurationsForPruneContext'
        ]

        if (
          all_api_config_keys.some((key) => event.affectsConfiguration(key))
        ) {
          handle_get_api_tool_configurations(this)
        }

        if (event.affectsConfiguration('codeWebChat.isTimelineCollapsed')) {
          handle_get_collapsed_states(this)
        }

        if (event.affectsConfiguration('codeWebChat.sendWithShiftEnter')) {
          this._send_send_with_shift_enter()
        }

        if (
          event.affectsConfiguration(
            'codeWebChat.pruneContextInstructionsPrefix'
          )
        ) {
          handle_get_prune_context_instructions_prefix(this)
        }
      }
    )

    token_count_emitter.on('token-count-updated', (token_count: number) => {
      if (this._webview_view) {
        this.send_message({
          command: 'TOKEN_COUNT_UPDATED',
          token_count
        })

        this.send_context_files()
      }
    })

    this.context.subscriptions.push(this._config_listener)

    const update_editor_state = () => {
      const active_editor = vscode.window.activeTextEditor
      const current_file_path = active_editor?.document.uri.fsPath
      let display_path: string | undefined

      if (current_file_path) {
        const workspace_root =
          this.workspace_provider.get_workspace_root_for_file(current_file_path)

        if (workspace_root) {
          const relative_path = path
            .relative(workspace_root, current_file_path)
            .replace(/\\/g, '/')

          const workspace_roots = this.workspace_provider.get_workspace_roots()
          if (workspace_roots.length > 1) {
            const workspace_name =
              this.workspace_provider.get_workspace_name(workspace_root)
            display_path = `${workspace_name}/${relative_path}`
          } else {
            display_path = relative_path
          }
        } else {
          display_path = current_file_path.replace(/\\/g, '/')
        }
      }

      if (display_path != this.currently_open_file_path) {
        this.currently_open_file_path = display_path
        if (this._webview_view) {
          this.send_message({
            command: 'EDITOR_STATE_CHANGED',
            currently_open_file_path: display_path
          })
        }
      }
      this.send_currently_open_file_text()
    }

    vscode.window.onDidChangeActiveTextEditor(() =>
      setTimeout(update_editor_state, 100)
    )
    update_editor_state()

    vscode.window.onDidChangeTextEditorSelection((event) => {
      const selection = event.textEditor.selection
      let new_selection: SelectionState | null = null

      if (!selection.isEmpty) {
        new_selection = {
          text: event.textEditor.document.getText(selection),
          start_line: selection.start.line + 1,
          start_col: selection.start.character + 1,
          end_line: selection.end.line + 1,
          end_col: selection.end.character + 1
        }
      }

      const has_changed =
        (this.current_selection?.text ?? null) !== (new_selection?.text ?? null)

      if (has_changed) {
        this.current_selection = new_selection
        if (this._webview_view) {
          this.send_message({
            command: 'EDITOR_SELECTION_CHANGED',
            current_selection: new_selection
          })
        }
      }
    })

    const update_selection_state = () => {
      const active_text_editor = vscode.window.activeTextEditor
      const selection = active_text_editor?.selection
      let new_selection: SelectionState | null = null

      if (active_text_editor && selection && !selection.isEmpty) {
        new_selection = {
          text: active_text_editor.document.getText(selection),
          start_line: selection.start.line + 1,
          start_col: selection.start.character + 1,
          end_line: selection.end.line + 1,
          end_col: selection.end.character + 1
        }
      }

      this.current_selection = new_selection
      if (this._webview_view) {
        this.send_message({
          command: 'EDITOR_SELECTION_CHANGED',
          current_selection: new_selection
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
        this.send_currently_open_file_text()
      }
    })
  }

  public get_presets_config_key(): string {
    const mode =
      this.mode == MODE.API ? this.api_prompt_type : this.web_prompt_type
    switch (mode) {
      case 'ask-about-context':
        return 'chatPresetsForAskAboutContext'
      case 'edit-context':
        return 'chatPresetsForEditContext'
      case 'code-at-cursor':
        return 'chatPresetsForCodeAtCursor'
      case 'prune-context':
        return 'chatPresetsForPruneContext'
      case 'no-context':
        return 'chatPresetsForNoContext'
    }
  }

  public cancel_all_intelligent_updates() {
    const sources = [...this.intelligent_update_cancel_token_sources]
    this.intelligent_update_cancel_token_sources = []
    sources.forEach((item) => item.source.cancel('Preview finished.'))
  }

  public send_context_files() {
    const workspace_files = this.workspace_provider.get_checked_files()

    const is_multi_root =
      this.workspace_provider.get_workspace_roots().length > 1

    const file_paths = workspace_files.map((file_path) => {
      const workspace_root =
        this.workspace_provider.get_workspace_root_for_file(file_path)
      if (!workspace_root) {
        return file_path.replace(/\\/g, '/') // Should not happen for context files
      }
      const relative_path = path
        .relative(workspace_root, file_path)
        .replace(/\\/g, '/')

      if (is_multi_root) {
        const workspace_name =
          this.workspace_provider.get_workspace_name(workspace_root)
        return `${workspace_name}/${relative_path}`
      }
      return relative_path
    })

    this.send_message({
      command: 'CONTEXT_FILES',
      file_paths
    })
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
          if (message.command == 'GET_CHECKPOINTS') {
            await this.send_checkpoints()
          } else if (message.command == 'CREATE_CHECKPOINT') {
            await handle_create_checkpoint(this)
          } else if (message.command == 'TOGGLE_CHECKPOINT_STAR') {
            await toggle_checkpoint_star({
              context: this.context,
              timestamp: message.timestamp,
              panel_provider: this
            })
          } else if (message.command == 'RESTORE_CHECKPOINT') {
            const checkpoints = await get_checkpoints(this.context)
            const checkpoint_to_restore = checkpoints.find(
              (c) => c.timestamp == message.timestamp
            )
            if (checkpoint_to_restore) {
              await restore_checkpoint({
                checkpoint: checkpoint_to_restore,
                workspace_provider: this.workspace_provider,
                context: this.context,
                panel_provider: this,
                websites_provider: this.websites_provider,
                options: {
                  show_auto_closing_modal_on_success: true
                }
              })
            }
          } else if (message.command == 'UPDATE_CHECKPOINT_DESCRIPTION') {
            await update_checkpoint_description({
              context: this.context,
              timestamp: message.timestamp,
              description: message.description,
              panel_provider: this
            })
          } else if (message.command == 'DELETE_CHECKPOINT') {
            await handle_delete_checkpoint(this, message)
          } else if (message.command == 'CLEAR_ALL_CHECKPOINTS') {
            await handle_clear_all_checkpoints(this)
          } else if (message.command == 'GET_HISTORY') {
            handle_get_history(this)
          } else if (message.command == 'GET_RESPONSE_HISTORY') {
            this.send_message({
              command: 'RESPONSE_HISTORY',
              history: this.response_history
            })
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
          } else if (message.command == 'SEND_TO_BROWSER') {
            await handle_send_to_browser({
              panel_provider: this,
              preset_name: message.preset_name,
              group_name: message.group_name,
              show_quick_pick: message.show_quick_pick,
              invocation_count: message.invocation_count
            })
          } else if (message.command == 'PREVIEW_PRESET') {
            await handle_preview_preset(this, message)
          } else if (message.command == 'COPY_PROMPT') {
            await handle_copy_prompt({
              panel_provider: this,
              instructions: message.instructions,
              preset_name: message.preset_name
            })
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            handle_request_editor_state(this)
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            handle_request_editor_selection_state(this)
          } else if (message.command == 'GET_CONTEXT_SIZE_WARNING_THRESHOLD') {
            this._send_context_size_warning_threshold()
          } else if (message.command == 'REQUEST_CURRENTLY_OPEN_FILE_TEXT') {
            this.send_currently_open_file_text()
          } else if (message.command == 'REPLACE_PRESETS') {
            await handle_replace_presets(this, message)
          } else if (message.command == 'GET_SEND_WITH_SHIFT_ENTER') {
            this._send_send_with_shift_enter()
          } else if (message.command == 'UPDATE_PRESET') {
            await handle_update_preset(this, message, webview_view)
          } else if (message.command == 'DELETE_PRESET_GROUP_OR_SEPARATOR') {
            await handle_delete_preset_group_or_separator(
              this,
              message,
              webview_view
            )
          } else if (message.command == 'DUPLICATE_PRESET_GROUP_OR_SEPARATOR') {
            await handle_duplicate_preset_group_or_separator(
              this,
              message,
              webview_view
            )
          } else if (message.command == 'CREATE_PRESET_GROUP_OR_SEPARATOR') {
            await handle_create_preset_group_or_separator(this, message)
          } else if (message.command == 'UNDO') {
            await handle_undo(this)
          } else if (message.command == 'APPLY_RESPONSE_FROM_HISTORY') {
            await handle_apply_response_from_history(message)
          } else if (message.command == 'EXECUTE_COMMAND') {
            await vscode.commands.executeCommand(message.command_id)
          } else if (message.command == 'EDIT_CONTEXT') {
            await handle_edit_context(this, message)
          } else if (message.command == 'CODE_COMPLETION') {
            await handle_code_completion(this, message)
          } else if (message.command == 'PRUNE_CONTEXT') {
            await handle_prune_context(this, message)
          } else if (message.command == 'SHOW_PROMPT_TEMPLATE_QUICK_PICK') {
            await handle_show_prompt_template_quick_pick(this)
          } else if (message.command == 'GET_WEB_PROMPT_TYPE') {
            handle_get_web_prompt_type(this)
          } else if (message.command == 'CANCEL_API_REQUEST') {
            if (this.api_call_cancel_token_source) {
              this.api_call_cancel_token_source.cancel('Cancelled by user.')
              this.api_call_cancel_token_source = null
            }
          } else if (message.command == 'CANCEL_API_MANAGER_REQUEST') {
            this.api_manager.cancel_api_call(message.id)
          } else if (message.command == 'GET_API_TOOL_CONFIGURATIONS') {
            await handle_get_api_tool_configurations(this)
          } else if (message.command == 'REORDER_API_TOOL_CONFIGURATIONS') {
            await handle_reorder_api_tool_configurations(this, message)
          } else if (
            message.command == 'TOGGLE_PINNED_API_TOOL_CONFIGURATION'
          ) {
            await handle_toggle_pinned_api_tool_configuration(this, message)
          } else if (message.command == 'SAVE_WEB_PROMPT_TYPE') {
            await handle_save_web_prompt_type(this, message.prompt_type)
            this._update_providers_compact_mode()
          } else if (message.command == 'GET_API_PROMPT_TYPE') {
            handle_get_api_prompt_type(this)
          } else if (message.command == 'SAVE_API_PROMPT_TYPE') {
            await handle_save_api_prompt_type(this, message.prompt_type)
            this._update_providers_compact_mode()
          } else if (message.command == 'GET_EDIT_FORMAT_INSTRUCTIONS') {
            handle_get_edit_format_instructions(this)
          } else if (message.command == 'GET_EDIT_FORMAT') {
            handle_get_edit_format(this)
          } else if (message.command == 'SAVE_EDIT_FORMAT') {
            await handle_save_edit_format(this, message)
          } else if (message.command == 'CARET_POSITION_CHANGED') {
            this.caret_position = message.caret_position
          } else if (message.command == 'SAVE_MODE') {
            await handle_save_mode(this, message)
            this._update_providers_compact_mode()
          } else if (message.command == 'GET_MODE') {
            handle_get_mode(this)
          } else if (message.command == 'GET_VERSION') {
            handle_get_version(this)
          } else if (message.command == 'SHOW_AT_SIGN_QUICK_PICK') {
            await handle_at_sign_quick_pick(this)
          } else if (message.command == 'SHOW_HASH_SIGN_QUICK_PICK') {
            await handle_hash_sign_quick_pick(
              this,
              this.context,
              message.is_for_code_completions
            )
          } else if (message.command == 'GO_TO_FILE') {
            handle_go_to_file(message)
          } else if (message.command == 'OPEN_FILE_AND_SELECT') {
            handle_open_file_and_select(message)
          } else if (message.command == 'SHOW_DIFF') {
            await handle_show_diff(message)
          } else if (message.command == 'FOCUS_ON_FILE_IN_PREVIEW') {
            handle_focus_on_file_in_preview(message)
          } else if (message.command == 'TOGGLE_FILE_IN_PREVIEW') {
            await handle_toggle_file_in_preview(message)
          } else if (message.command == 'DISCARD_USER_CHANGES_IN_PREVIEW') {
            await handle_discard_user_changes_in_preview(message)
          } else if (message.command == 'INTELLIGENT_UPDATE_FILE_IN_PREVIEW') {
            await handle_intelligent_update_file_in_preview(this, message)
          } else if (
            message.command == 'CANCEL_INTELLIGENT_UPDATE_FILE_IN_PREVIEW'
          ) {
            handle_cancel_intelligent_update_file_in_preview(this, message)
          } else if (message.command == 'RESPONSE_PREVIEW') {
            await handle_response_preview(message)
          } else if (message.command == 'REMOVE_RESPONSE_HISTORY_ITEM') {
            this.response_history = this.response_history.filter(
              (item) => item.created_at !== message.created_at
            )
          } else if (message.command == 'GET_WORKSPACE_STATE') {
            handle_get_workspace_state(this)
          } else if (message.command == 'PICK_OPEN_ROUTER_MODEL') {
            await handle_pick_open_router_model(this)
          } else if (message.command == 'PICK_CHATBOT') {
            await handle_pick_chatbot(this, message)
          } else if (message.command == 'UPDATE_LAST_USED_PRESET') {
            update_last_used_preset_or_group({
              panel_provider: this,
              preset_name: message.preset_name
            })
          } else if (message.command == 'MANAGE_CONFIGURATIONS') {
            await handle_manage_configurations(message)
          } else if (message.command == 'GET_COLLAPSED_STATES') {
            handle_get_collapsed_states(this)
          } else if (message.command == 'SAVE_COMPONENT_COLLAPSED_STATE') {
            await handle_save_component_collapsed_state(this, message)
          } else if (message.command == 'PREVIEW_SWITCH_CHOICE') {
            if (this.preview_switch_choice_resolver) {
              this.preview_switch_choice_resolver(message.choice)
            }
          } else if (message.command == 'GET_TASKS') {
            await handle_get_tasks(this)
          } else if (message.command == 'SAVE_TASKS') {
            await handle_save_tasks(this, message)
          } else if (message.command == 'DELETE_TASK') {
            await handle_delete_task(this, message)
          } else if (message.command == 'PREVIEW_GENERATED_CODE') {
            await handle_preview_generated_code(message)
          } else if (message.command == 'REQUEST_CAN_UNDO') {
            handle_request_can_undo(this)
          } else if (message.command == 'FIX_ALL_FAILED_FILES') {
            await handle_fix_all_failed_files(this, message.files)
          } else if (
            message.command == 'GET_PRUNE_CONTEXT_INSTRUCTIONS_PREFIX'
          ) {
            handle_get_prune_context_instructions_prefix(this)
          } else if (
            message.command == 'SAVE_PRUNE_CONTEXT_INSTRUCTIONS_PREFIX'
          ) {
            await handle_save_prune_context_instructions_prefix(message.prefix)
          } else if (message.command == 'UPSERT_CONFIGURATION') {
            const tool_type_map: Record<string, string> = {
              'edit-context': 'edit-context',
              'code-at-cursor': 'code-at-cursor',
              'prune-context': 'prune-context'
            }
            await upsert_configuration({
              context: this.context,
              tool_type: tool_type_map[message.tool_type] || message.tool_type,
              configuration_id: message.configuration_id,
              create_on_top: message.create_on_top,
              insertion_index: message.insertion_index
            })
          } else if (message.command == 'DELETE_CONFIGURATION') {
            const tool_type_map: Record<string, any> = {
              'edit-context': 'edit-context',
              'code-at-cursor': 'code-at-cursor',
              'prune-context': 'prune-context'
            }
            await delete_configuration(
              this.context,
              message.configuration_id,
              tool_type_map[message.api_prompt_type] || message.api_prompt_type
            )
          } else if (message.command == 'OPEN_EXTERNAL_URL') {
            await handle_open_external_url(message)
          } else if (message.command == 'SAVE_PROMPT_IMAGE') {
            await handle_save_prompt_image(this, message)
          } else if (message.command == 'OPEN_PROMPT_IMAGE') {
            await handle_open_prompt_image(message)
          } else if (message.command == 'SAVE_PROMPT_DOCUMENT') {
            await handle_save_prompt_document(this, message)
          } else if (message.command == 'OPEN_PROMPT_DOCUMENT') {
            await handle_open_prompt_document(message)
          } else if (message.command == 'PASTE_URL') {
            await handle_paste_url(this, message)
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
  }

  public send_presets_to_webview(_: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_prompt_types: WebPromptType[] = [
      'ask-about-context',
      'prune-context',
      'edit-context',
      'code-at-cursor',
      'no-context'
    ]
    const mode_to_config_key: Record<WebPromptType, string> = {
      'ask-about-context': 'chatPresetsForAskAboutContext',
      'edit-context': 'chatPresetsForEditContext',
      'code-at-cursor': 'chatPresetsForCodeAtCursor',
      'prune-context': 'chatPresetsForPruneContext',
      'no-context': 'chatPresetsForNoContext'
    }
    const all_presets = Object.fromEntries(
      web_prompt_types.map((prompt_type) => {
        const presets_config_key = mode_to_config_key[prompt_type]
        const presets_config =
          config.get<ConfigPresetFormat[]>(presets_config_key, []) || []
        const presets_ui = presets_config
          .filter(
            (preset_config) =>
              !preset_config.chatbot || CHATBOTS[preset_config.chatbot]
          )
          .map((preset_config) => config_preset_to_ui_format(preset_config))
        return [prompt_type, presets_ui]
      })
    ) as { [T in WebPromptType]: Preset[] }
    this.send_message({
      command: 'PRESETS',
      presets: all_presets,
      selected_preset_or_group_name_by_mode: Object.fromEntries(
        web_prompt_types.map((prompt_type) => {
          const presets_for_mode = all_presets[prompt_type]
          let selected_name: string | undefined = undefined
          const key = get_recently_used_presets_or_groups_key(prompt_type)
          const recents =
            this.context.workspaceState.get<string[]>(key) ??
            this.context.globalState.get<string[]>(key, [])
          const last_selected = recents[0]
          if (last_selected) {
            if (last_selected == 'Ungrouped') {
              const first_group_index = presets_for_mode.findIndex(
                (p) => !p.chatbot
              )
              if (
                first_group_index > 0 ||
                (first_group_index == -1 && presets_for_mode.length > 0)
              ) {
                selected_name = last_selected
              }
            } else if (presets_for_mode.some((p) => p.name === last_selected)) {
              selected_name = last_selected
            }
          }
          return [prompt_type, selected_name]
        })
      ),
      selected_configuration_id_by_prompt_type: {
        'edit-context': (this.context.workspaceState.get<string[]>(
          RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY
        ) || [])[0],
        'code-at-cursor': (this.context.workspaceState.get<string[]>(
          RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
        ) || [])[0],
        'prune-context': (this.context.workspaceState.get<string[]>(
          RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY
        ) || [])[0]
      }
    })
  }

  private _send_context_size_warning_threshold() {
    if (!this._webview_view) return
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const threshold =
      config.get<number>('contextSizeWarningThreshold') ||
      DEFAULT_CONTEXT_SIZE_WARNING_THRESHOLD
    this.send_message({
      command: 'CONTEXT_SIZE_WARNING_THRESHOLD',
      threshold
    })
  }

  public set_undo_button_state = (can_undo: boolean) => {
    this.send_message({
      command: 'CAN_UNDO_CHANGED',
      can_undo
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

    const bangers_font_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extension_uri,
        'resources',
        'Bangers-Regular.ttf'
      )
    )

    return `<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${style_uri}">
  <script>
    window.resources_uri = "${resources_uri}";
  </script>
  <style>
    @font-face {
      font-family: 'Bangers';
      src: url('${bangers_font_uri}') format('truetype');
    }
    body { overflow: hidden; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${script_uri}"></script>
</body>
</html>`
  }

  public add_text_at_cursor_position(text: string, chars_to_remove_before = 0) {
    const is_in_code_completions_mode =
      (this.mode == MODE.WEB && this.web_prompt_type == 'code-at-cursor') ||
      (this.mode == MODE.API && this.api_prompt_type == 'code-at-cursor')

    let current_instructions = ''
    let new_instructions = ''
    const mode: WebPromptType | ApiPromptType = is_in_code_completions_mode
      ? 'code-at-cursor'
      : this.mode == MODE.WEB
        ? this.web_prompt_type
        : this.api_prompt_type

    switch (mode) {
      case 'ask-about-context':
        current_instructions = this.ask_about_context_instructions
        break
      case 'edit-context':
        current_instructions = this.edit_context_instructions
        break
      case 'no-context':
        current_instructions = this.no_context_instructions
        break
      case 'code-at-cursor':
        current_instructions = this.code_at_cursor_instructions
        break
      case 'prune-context':
        current_instructions = this.prune_context_instructions
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
      case 'ask-about-context':
        this.ask_about_context_instructions = new_instructions
        break
      case 'edit-context':
        this.edit_context_instructions = new_instructions
        break
      case 'no-context':
        this.no_context_instructions = new_instructions
        break
      case 'code-at-cursor':
        this.code_at_cursor_instructions = new_instructions
        break
      case 'prune-context':
        this.prune_context_instructions = new_instructions
        break
    }

    this.caret_position = new_caret_position

    this.send_message({
      command: 'INSTRUCTIONS',
      ask_about_context: this.ask_about_context_instructions,
      edit_context: this.edit_context_instructions,
      no_context: this.no_context_instructions,
      code_at_cursor: this.code_at_cursor_instructions,
      prune_context: this.prune_context_instructions,
      caret_position: this.caret_position
    })
  }
}

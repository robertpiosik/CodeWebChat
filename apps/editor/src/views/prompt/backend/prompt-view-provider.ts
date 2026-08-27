import * as vscode from 'vscode'
import * as path from 'path'
import { ChildProcessWithoutNullStreams } from 'child_process'
import { WebSocketManager } from '@/services/websocket-manager'
import {
  FrontendMessage,
  BackendMessage,
  InstructionsState
} from '../types/messages'
import { PromptViewApiCallsManager } from '@/services/prompt-view-api-calls-manager'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { token_count_emitter } from '@/context/context-initialization'
import { EditFormat } from '@shared/types/edit-format'
import {
  handle_copy_prompt,
  handle_autofill,
  handle_create_web_configuration,
  handle_update_web_configuration,
  handle_delete_web_configuration,
  handle_preview_web_configuration,
  handle_reorder_web_configurations,
  handle_toggle_pinned_web_configuration,
  handle_get_connection_status,
  handle_get_history,
  handle_apply_response_from_history,
  handle_save_history,
  handle_save_instructions,
  handle_get_instructions,
  handle_request_editor_state,
  handle_request_editor_selection_state,
  handle_make_api_call,
  handle_get_edit_format,
  handle_save_edit_format,
  handle_get_edit_format_instructions,
  handle_at_sign_quick_pick,
  handle_get_web_prompt_type,
  handle_save_web_prompt_type,
  handle_mode_changed,
  handle_get_api_prompt_type,
  handle_save_api_prompt_type,
  handle_get_mode,
  handle_get_workspace_state,
  handle_get_version,
  handle_template_quick_pick,
  handle_get_api_configurations,
  handle_reorder_api_configurations,
  handle_toggle_pinned_api_configuration,
  handle_pick_model,
  handle_pick_chatbot,
  handle_pick_reasoning_effort,
  handle_focus_on_file_in_preview,
  handle_go_to_file,
  handle_show_diff,
  handle_toggle_file_in_preview,
  handle_discard_user_changes_in_preview,
  handle_intelligent_update_file_in_preview,
  handle_response_preview,
  handle_manage_api_configurations,
  handle_undo,
  handle_request_can_undo,
  handle_preview_generated_code,
  handle_get_tasks,
  handle_save_tasks,
  handle_delete_task,
  handle_fix_all_failed_files,
  handle_open_external_url,
  handle_hash_sign_quick_pick,
  handle_open_file_and_select,
  handle_save_prompt_image,
  handle_open_prompt_image,
  handle_save_prompt_pasted_text,
  handle_open_prompt_pasted_text,
  handle_paste_url,
  handle_voice_input,
  handle_open_website,
  handle_cancel_intelligent_update_file_in_preview,
  handle_create_api_configuration,
  handle_delete_api_configuration,
  handle_update_last_used_web_configuration,
  handle_request_return_home,
  handle_pick_tasks_workspace
} from './message-handlers'
import { handle_update_api_configuration } from './message-handlers/handle-update-api-configuration'
import { handle_pick_model_provider } from './message-handlers/handle-pick-model-provider'
import { handle_pick_api_model } from './message-handlers/handle-pick-api-model'
import { handle_pick_api_reasoning_effort } from './message-handlers/handle-pick-api-reasoning-effort'
import { handle_select_edit_format } from './message-handlers/handle-select-edit-format'
import { SelectionState } from '../types/messages'
import {
  EDIT_FORMAT_STATE_KEY,
  get_edit_format_state_key,
  API_MODE_STATE_KEY,
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_EDIT_FILES_STATE_KEY,
  PROMPT_VIEW_MODE_STATE_KEY,
  WEB_MODE_STATE_KEY,
  LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY,
  get_last_used_web_configuration_key
} from '@/constants/state-keys'
import {
  config_web_configuration_to_ui_format,
  ConfigWebConfigurationFormat
} from '@/utils/web-configuration-format-converters'
import { CHATBOTS } from '@shared/constants/chatbots'
import { MODE, Mode } from '@shared/types/mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { Logger } from '@shared/utils/logger'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { dictionary } from '@shared/constants/dictionary'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { SharedContextState } from '@/context/shared-context-state'
import { webview_html } from '@/views/shared/utils/webview-html'
import { get_selected_files } from '@/context/helpers/get-selected-files'
import { normalize_path } from '@/utils/normalize-path'
import { replace_symbols } from './utils/symbols/replace-symbols'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'

export class PromptViewProvider implements vscode.WebviewViewProvider {
  public readonly extension_uri: vscode.Uri
  public readonly workspace_provider: WorkspaceProvider
  public readonly open_editors_provider: OpenEditorsProvider
  public readonly extension_context: vscode.ExtensionContext
  public readonly websocket_server_instance: WebSocketManager
  public readonly shared_context_state: SharedContextState
  public webview_view: vscode.WebviewView | undefined
  private _config_listener: vscode.Disposable | undefined
  public currently_open_file_path?: string
  public current_selection: SelectionState | null = null
  public caret_position: number = 0
  public ask_about_context_instructions: InstructionsState = {
    instructions: [''],
    active_index: 0
  }
  public edit_files_instructions: InstructionsState = {
    instructions: [''],
    active_index: 0
  }
  public web_prompt_type: WebPromptType
  public web_edit_format: EditFormat
  public api_edit_format: EditFormat
  public api_prompt_type: ApiPromptType
  public mode: Mode = MODE.WEB

  public get edit_format(): EditFormat {
    return this.mode == MODE.WEB ? this.web_edit_format : this.api_edit_format
  }

  public set edit_format(value: EditFormat) {
    if (this.mode == MODE.WEB) {
      this.web_edit_format = value
    } else {
      this.api_edit_format = value
    }
  }
  public intelligent_update_abort_controllers: {
    controller: AbortController
    file_path: string
    workspace_name?: string
  }[] = []
  public api_call_abort_controller: AbortController | null = null
  public current_selected_files_token_count: number = 0
  public prompt_view_api_calls_manager!: PromptViewApiCallsManager
  public response_history: ResponseHistoryItem[] = []
  public message_listeners: ((message: BackendMessage) => void)[] = []

  // Voice input
  public is_recording = false
  public recording_process: ChildProcessWithoutNullStreams | null = null
  public audio_chunks: Buffer[] = []
  public recording_start_time: number = 0

  public get current_ask_about_context_instruction(): string {
    return (
      this.ask_about_context_instructions.instructions[
        this.ask_about_context_instructions.active_index
      ] || ''
    )
  }

  public get current_edit_files_instruction(): string {
    return (
      this.edit_files_instructions.instructions[
        this.edit_files_instructions.active_index
      ] || ''
    )
  }

  public get prompt_type(): WebPromptType | ApiPromptType {
    return this.mode == MODE.WEB ? this.web_prompt_type : this.api_prompt_type
  }

  public get active_instructions_state(): InstructionsState {
    const type = this.prompt_type
    if (type == 'ask-about-files') return this.ask_about_context_instructions
    if (type == 'edit-files') return this.edit_files_instructions
    return this.edit_files_instructions
  }

  public get current_instruction(): string {
    const state = this.active_instructions_state
    return state.instructions[state.active_index] || ''
  }

  public preview_switch_choice_resolver:
    | ((choice: 'Switch' | undefined) => void)
    | undefined = undefined

  public set_prompt_view_api_calls_manager(
    prompt_view_api_calls_manager: PromptViewApiCallsManager
  ) {
    this.prompt_view_api_calls_manager = prompt_view_api_calls_manager
  }

  private _send_send_with_shift_enter() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const enabled = config.get<boolean>('sendWithShiftEnter', false)
    this.send_message({
      command: 'SEND_WITH_SHIFT_ENTER',
      enabled
    })
  }

  private _send_voice_input_push_to_talk() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const enabled = config.get<boolean>('voiceInputPushToTalk', false)
    this.send_message({
      command: 'VOICE_INPUT_PUSH_TO_TALK',
      enabled
    })
  }

  private _send_is_modern_ui() {
    const config = vscode.workspace.getConfiguration('workbench')
    const is_modern_ui = config.get<boolean>('experimental.modernUI', false)
    this.send_message({
      command: 'IS_MODERN_UI',
      is_modern_ui
    })
  }

  public async send_setup_progress() {
    const providers_manager = new ModelProvidersManager(this.extension_context)
    const [model_providers, configs] = await Promise.all([
      providers_manager.get_model_providers(),
      providers_manager.get_api_configurations()
    ])

    this.send_message({
      command: 'SETUP_PROGRESS',
      setup_progress: {
        has_model_provider: model_providers.length > 0,
        has_api_configuration: configs.length > 0
      }
    })
  }

  public send_currently_open_file_text() {
    const active_editor = vscode.window.activeTextEditor
    this.send_message({
      command: 'CURRENTLY_OPEN_FILE_TEXT',
      text: active_editor ? active_editor.document.getText() : undefined
    })
  }

  constructor(params: {
    extension_uri: vscode.Uri
    workspace_provider: WorkspaceProvider
    open_editors_provider: OpenEditorsProvider
    extension_context: vscode.ExtensionContext
    websocket_server_instance: WebSocketManager
    shared_context_state: SharedContextState
  }) {
    this.extension_uri = params.extension_uri
    this.workspace_provider = params.workspace_provider
    this.open_editors_provider = params.open_editors_provider
    this.extension_context = params.extension_context
    this.websocket_server_instance = params.websocket_server_instance
    this.shared_context_state = params.shared_context_state

    this.websocket_server_instance.on_connection_status_change((connected) => {
      if (this.webview_view) {
        this.send_message({
          command: 'CONNECTION_STATUS',
          connected
        })
      }
    })

    this.edit_files_instructions = this._load_instructions(
      INSTRUCTIONS_EDIT_FILES_STATE_KEY
    )
    this.ask_about_context_instructions = this._load_instructions(
      INSTRUCTIONS_ASK_STATE_KEY
    )

    this.web_edit_format =
      this.extension_context.workspaceState.get<EditFormat>(
        get_edit_format_state_key(MODE.WEB)
      ) ??
      this.extension_context.globalState.get<EditFormat>(
        get_edit_format_state_key(MODE.WEB)
      ) ??
      this.extension_context.workspaceState.get<EditFormat>(
        EDIT_FORMAT_STATE_KEY
      ) ??
      this.extension_context.globalState.get<EditFormat>(
        EDIT_FORMAT_STATE_KEY
      ) ??
      'whole'

    this.api_edit_format =
      this.extension_context.workspaceState.get<EditFormat>(
        get_edit_format_state_key(MODE.API)
      ) ??
      this.extension_context.globalState.get<EditFormat>(
        get_edit_format_state_key(MODE.API)
      ) ??
      this.extension_context.workspaceState.get<EditFormat>(
        EDIT_FORMAT_STATE_KEY
      ) ??
      this.extension_context.globalState.get<EditFormat>(
        EDIT_FORMAT_STATE_KEY
      ) ??
      'whole'

    this.mode =
      this.extension_context.workspaceState.get<Mode>(
        PROMPT_VIEW_MODE_STATE_KEY
      ) ??
      this.extension_context.globalState.get<Mode>(
        PROMPT_VIEW_MODE_STATE_KEY
      ) ??
      MODE.WEB

    this.web_prompt_type =
      this.extension_context.workspaceState.get<WebPromptType>(
        WEB_MODE_STATE_KEY,
        'edit-files'
      )
    this.api_prompt_type =
      this.extension_context.workspaceState.get<ApiPromptType>(
        API_MODE_STATE_KEY,
        'edit-files'
      )

    this.extension_context.subscriptions.push(
      vscode.window.onDidChangeWindowState(async (e) => {
        if (e.focused) {
          this.send_message({
            command: 'RESET_APPLY_BUTTON_TEMPORARY_DISABLED_STATE'
          })
          handle_get_tasks(this)
        }
      })
    )

    this.extension_context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        handle_get_tasks(this)
        handle_get_workspace_state(this)
        this.send_selected_files()
      })
    )

    this._config_listener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (!this.webview_view) return
        if (event.affectsConfiguration('codeWebChat.webConfigurations')) {
          this.send_web_configurations_to_webview(this.webview_view.webview)
        }

        if (event.affectsConfiguration('codeWebChat.apiConfigurations')) {
          handle_get_api_configurations(this)
        }

        const setup_progress_keys = [
          'codeWebChat.modelProviders',
          'codeWebChat.apiConfigurations'
        ]

        if (
          setup_progress_keys.some((key) => event.affectsConfiguration(key))
        ) {
          this.send_setup_progress()
        }

        if (event.affectsConfiguration('codeWebChat.sendWithShiftEnter')) {
          this._send_send_with_shift_enter()
        }

        if (event.affectsConfiguration('codeWebChat.voiceInputPushToTalk')) {
          this._send_voice_input_push_to_talk()
        }

        if (event.affectsConfiguration('workbench.experimental.modernUI')) {
          this._send_is_modern_ui()
        }
      }
    )

    token_count_emitter.on('token-count-updated', (token_count: number) => {
      this.current_selected_files_token_count = token_count
      if (this.webview_view) {
        this.send_token_count()
        this.send_selected_files()
      }
    })

    this.extension_context.subscriptions.push(this._config_listener)

    const update_editor_state = () => {
      const active_editor = vscode.window.activeTextEditor
      const current_file_path = active_editor?.document.uri.fsPath
      let display_path: string | undefined

      if (current_file_path) {
        const workspace_root =
          this.workspace_provider.get_workspace_root_for_file(current_file_path)

        if (workspace_root) {
          const relative_path = normalize_path(
            path.relative(workspace_root, current_file_path)
          )

          const workspace_roots = this.workspace_provider.get_workspace_roots()
          if (workspace_roots.length > 1) {
            const workspace_name =
              this.workspace_provider.get_workspace_name(workspace_root)
            display_path = `${workspace_name}/${relative_path}`
          } else {
            display_path = relative_path
          }
        } else {
          display_path = normalize_path(current_file_path)
        }
      }

      if (display_path != this.currently_open_file_path) {
        this.currently_open_file_path = display_path
        if (this.webview_view) {
          this.send_message({
            command: 'EDITOR_STATE_CHANGED',
            currently_open_file_path: display_path
          })
        }
      }
      this.send_currently_open_file_text()
    }

    this.extension_context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() =>
        setTimeout(update_editor_state, 100)
      )
    )
    update_editor_state()

    this.extension_context.subscriptions.push(
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
          (this.current_selection?.text ?? null) !==
          (new_selection?.text ?? null)

        if (has_changed) {
          this.current_selection = new_selection
          if (this.webview_view) {
            this.send_message({
              command: 'EDITOR_SELECTION_CHANGED',
              current_selection: new_selection
            })
          }
        }
      })
    )

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
      if (this.webview_view) {
        this.send_message({
          command: 'EDITOR_SELECTION_CHANGED',
          current_selection: new_selection
        })
      }
    }

    this.extension_context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() =>
        setTimeout(update_selection_state, 100)
      )
    )
    update_selection_state()

    this.extension_context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (
          vscode.window.activeTextEditor &&
          event.document === vscode.window.activeTextEditor.document
        ) {
          this.send_currently_open_file_text()
        }
      })
    )
  }

  public cancel_all_intelligent_updates() {
    const controllers = [...this.intelligent_update_abort_controllers]
    this.intelligent_update_abort_controllers = []
    controllers.forEach((item) => item.controller.abort('Preview finished.'))
  }

  public async send_token_count() {
    const edit_instructions_result = await replace_symbols({
      instruction: this.current_edit_files_instruction,
      extension_context: this.extension_context,
      workspace_provider: this.workspace_provider,
      remove_images: true
    })
    const ask_instructions_result = await replace_symbols({
      instruction: this.current_ask_about_context_instruction,
      extension_context: this.extension_context,
      workspace_provider: this.workspace_provider,
      remove_images: true
    })

    let formatted_system_instructions = ''
    const edit_format_instructions = {
      whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
      truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
      'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
      diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
    }[this.edit_format]
    if (edit_format_instructions) {
      formatted_system_instructions = `# Output formatting\n\n${edit_format_instructions}`
    }

    this.send_message({
      command: 'TOKEN_COUNT_UPDATED',
      selected_files_token_count: this.current_selected_files_token_count,
      edit_instructions_token_count: Math.ceil(
        (edit_instructions_result.instruction.length +
          edit_instructions_result.skill_definitions.length) /
          4
      ),
      ask_instructions_token_count: Math.ceil(
        (ask_instructions_result.instruction.length +
          ask_instructions_result.skill_definitions.length) /
          4
      ),
      edit_format_instructions_token_count: Math.ceil(
        formatted_system_instructions.length / 4
      )
    })
  }

  public send_selected_files() {
    const file_paths = get_selected_files({
      workspace_provider: this.workspace_provider,
      shared_context_state: this.shared_context_state
    })

    this.send_message({
      command: 'SELECTED_FILES',
      file_paths
    })
  }

  private _load_instructions(key: string): InstructionsState {
    return (
      this.extension_context.workspaceState.get<any>(key) || {
        instructions: [''],
        active_index: 0
      }
    )
  }

  public send_message(message: BackendMessage) {
    if (this.webview_view) {
      this.webview_view.webview.postMessage(message)
    }
    for (const listener of this.message_listeners) {
      listener(message)
    }
  }

  public show_preview_ongoing_modal() {
    const items_without_files_count = this.response_history.filter(
      (item) => item.files === undefined
    ).length

    if (items_without_files_count > 1) {
      if (this.preview_switch_choice_resolver) {
        this.preview_switch_choice_resolver(undefined)
      }
    } else {
      this.send_message({
        command: 'SHOW_PREVIEW_ONGOING_MODAL'
      })
    }
  }

  async resolveWebviewView(
    webview_view: vscode.WebviewView,
    _: vscode.WebviewViewResolveContext,
    __: vscode.CancellationToken
  ) {
    this.webview_view = webview_view

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
            this.send_token_count()
          } else if (message.command == 'GET_CONNECTION_STATUS') {
            handle_get_connection_status(this)
          } else if (message.command == 'GET_WEB_CONFIGURATIONS') {
            this.send_web_configurations_to_webview(webview_view.webview)
          } else if (message.command == 'AUTOFILL') {
            await handle_autofill({
              prompt_view_provider: this,
              web_configuration_name: message.web_configuration_name,
              show_quick_pick: message.show_quick_pick
            })
          } else if (message.command == 'PREVIEW_WEB_CONFIGURATION') {
            await handle_preview_web_configuration(this, message)
          } else if (message.command == 'COPY_PROMPT') {
            await handle_copy_prompt({
              prompt_view_provider: this,
              instructions: message.instructions,
              web_configuration_name: message.web_configuration_name
            })
          } else if (message.command == 'REQUEST_EDITOR_STATE') {
            handle_request_editor_state(this)
          } else if (message.command == 'REQUEST_EDITOR_SELECTION_STATE') {
            handle_request_editor_selection_state(this)
          } else if (message.command == 'REQUEST_CURRENTLY_OPEN_FILE_TEXT') {
            this.send_currently_open_file_text()
          } else if (message.command == 'REORDER_WEB_CONFIGURATIONS') {
            await handle_reorder_web_configurations(message)
          } else if (message.command == 'TOGGLE_PINNED_WEB_CONFIGURATION') {
            await handle_toggle_pinned_web_configuration(message)
          } else if (message.command == 'GET_SEND_WITH_SHIFT_ENTER') {
            this._send_send_with_shift_enter()
          } else if (message.command == 'CREATE_WEB_CONFIGURATION') {
            await handle_create_web_configuration(this, message)
          } else if (message.command == 'UPDATE_WEB_CONFIGURATION') {
            await handle_update_web_configuration(this, message)
          } else if (message.command == 'DELETE_WEB_CONFIGURATION') {
            await handle_delete_web_configuration(message)
          } else if (message.command == 'UNDO') {
            await handle_undo(this)
            this.send_token_count()
          } else if (message.command == 'APPLY_RESPONSE_FROM_HISTORY') {
            await handle_apply_response_from_history(message)
            this.send_token_count()
          } else if (message.command == 'EXECUTE_COMMAND') {
            await vscode.commands.executeCommand(message.command_id)
          } else if (message.command == 'MAKE_API_CALL') {
            await handle_make_api_call(this, message)
          } else if (message.command == 'SHOW_TEMPLATE_QUICK_PICK') {
            await handle_template_quick_pick(this)
          } else if (message.command == 'GET_WEB_PROMPT_TYPE') {
            handle_get_web_prompt_type(this)
          } else if (message.command == 'CANCEL_API_REQUEST') {
            if (this.api_call_abort_controller) {
              this.api_call_abort_controller.abort('Cancelled by user.')
              this.api_call_abort_controller = null
            }
          } else if (
            message.command == 'CANCEL_PROMPT_VIEW_API_CALLS_MANAGER_REQUEST'
          ) {
            this.prompt_view_api_calls_manager.cancel_api_call(message.id)
          } else if (message.command == 'GET_API_CONFIGURATIONS') {
            await handle_get_api_configurations(this)
          } else if (message.command == 'REORDER_API_CONFIGURATIONS') {
            await handle_reorder_api_configurations(this, message)
          } else if (message.command == 'TOGGLE_PINNED_API_CONFIGURATION') {
            await handle_toggle_pinned_api_configuration(this, message)
          } else if (message.command == 'SAVE_WEB_PROMPT_TYPE') {
            await handle_save_web_prompt_type(this, message.prompt_type)
          } else if (message.command == 'GET_API_PROMPT_TYPE') {
            handle_get_api_prompt_type(this)
          } else if (message.command == 'SAVE_API_PROMPT_TYPE') {
            await handle_save_api_prompt_type(this, message.prompt_type)
          } else if (message.command == 'GET_EDIT_FORMAT_INSTRUCTIONS') {
            handle_get_edit_format_instructions(this)
          } else if (message.command == 'GET_EDIT_FORMAT') {
            handle_get_edit_format(this)
          } else if (message.command == 'SAVE_EDIT_FORMAT') {
            await handle_save_edit_format(this, message)
          } else if (message.command == 'SELECT_EDIT_FORMAT') {
            await handle_select_edit_format(this, message)
          } else if (message.command == 'CARET_POSITION_CHANGED') {
            this.caret_position = message.caret_position
          } else if (message.command == 'MODE_CHANGED') {
            handle_mode_changed(this, message)
          } else if (message.command == 'GET_MODE') {
            handle_get_mode(this)
          } else if (message.command == 'GET_VERSION') {
            handle_get_version(this)
          } else if (message.command == 'SHOW_AT_SIGN_QUICK_PICK') {
            await handle_at_sign_quick_pick(this)
          } else if (message.command == 'SHOW_HASH_SIGN_QUICK_PICK') {
            await handle_hash_sign_quick_pick(this, this.extension_context)
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
          } else if (message.command == 'PICK_MODEL') {
            await handle_pick_model(this, message)
          } else if (message.command == 'PICK_CHATBOT') {
            await handle_pick_chatbot(this, message)
          } else if (message.command == 'PICK_REASONING_EFFORT') {
            await handle_pick_reasoning_effort(this, message)
          } else if (message.command == 'UPDATE_LAST_USED_WEB_CONFIGURATION') {
            handle_update_last_used_web_configuration({
              prompt_view_provider: this,
              web_configuration_name: message.web_configuration_name
            })
          } else if (message.command == 'MANAGE_API_CONFIGURATIONS') {
            await handle_manage_api_configurations()
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
          } else if (message.command == 'UPDATE_FILE_PROGRESS') {
            // Handle the message internally instead of invoking a command
          } else if (message.command == 'OPEN_EXTERNAL_URL') {
            await handle_open_external_url(message)
          } else if (message.command == 'CREATE_API_CONFIGURATION') {
            await handle_create_api_configuration(this, message)
          } else if (message.command == 'UPDATE_API_CONFIGURATION') {
            await handle_update_api_configuration(this, message)
          } else if (message.command == 'PICK_MODEL_PROVIDER') {
            await handle_pick_model_provider(this, message)
          } else if (message.command == 'PICK_API_MODEL') {
            await handle_pick_api_model(this, message)
          } else if (message.command == 'PICK_API_REASONING_EFFORT') {
            await handle_pick_api_reasoning_effort(this, message)
          } else if (message.command == 'DELETE_API_CONFIGURATION') {
            await handle_delete_api_configuration(this, message)
          } else if (message.command == 'REQUEST_CAN_UNDO') {
            handle_request_can_undo(this)
          } else if (message.command == 'FIX_ALL_FAILED_FILES') {
            await handle_fix_all_failed_files({
              prompt_view_provider: this,
              files_to_fix: message.files
            })
          } else if (message.command == 'SAVE_PROMPT_IMAGE') {
            await handle_save_prompt_image(this, message)
          } else if (message.command == 'OPEN_PROMPT_IMAGE') {
            await handle_open_prompt_image(message)
          } else if (message.command == 'SAVE_PROMPT_PASTED_TEXT') {
            await handle_save_prompt_pasted_text(this, message)
          } else if (message.command == 'OPEN_PROMPT_PASTED_TEXT') {
            await handle_open_prompt_pasted_text(message)
          } else if (message.command == 'PASTE_URL') {
            await handle_paste_url(this, message)
          } else if (message.command == 'OPEN_WEBSITE') {
            await handle_open_website(message)
          } else if (message.command == 'SET_RECORDING_STATE') {
            await handle_voice_input(this, message)
          } else if (message.command == 'GET_SETUP_PROGRESS') {
            await this.send_setup_progress()
          } else if (message.command == 'REQUEST_RETURN_HOME') {
            await handle_request_return_home(this)
          } else if (message.command == 'GET_VOICE_INPUT_PUSH_TO_TALK') {
            this._send_voice_input_push_to_talk()
          } else if (message.command == 'GET_IS_MODERN_UI') {
            this._send_is_modern_ui()
          } else if (message.command == 'PICK_TASKS_WORKSPACE') {
            await handle_pick_tasks_workspace(this, message)
          } else if (message.command == 'GET_TOKEN_COUNT') {
            this.send_token_count()
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

  public send_web_configurations_to_webview(_: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('codeWebChat')

    const web_configurations_config =
      config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []
    const web_configurations_ui = web_configurations_config
      .filter((config) => config.chatbot && CHATBOTS[config.chatbot])
      .map((config) => {
        let model = config.model
        if (config.chatbot && model) {
          const chatbot_info = CHATBOTS[config.chatbot]
          const is_user_provided_supported =
            chatbot_info.supports_user_provided_model
          const is_model_predefined = chatbot_info.models?.[model]

          if (!is_user_provided_supported && !is_model_predefined) {
            model = undefined
          }
        }
        return config_web_configuration_to_ui_format({ ...config, model })
      })

    const web_prompt_types: WebPromptType[] = ['ask-about-files', 'edit-files']

    this.send_message({
      command: 'WEB_CONFIGURATIONS',
      web_configurations: web_configurations_ui,
      selected_web_configuration_name_by_mode: Object.fromEntries(
        web_prompt_types.map((prompt_type) => {
          let selected_name: string | undefined = undefined
          const key = get_last_used_web_configuration_key(prompt_type)
          const last_selected =
            this.extension_context.workspaceState.get<string>(key) ??
            this.extension_context.globalState.get<string>(key)
          if (last_selected) {
            if (web_configurations_ui.some((p) => p.name == last_selected)) {
              selected_name = last_selected
            }
          }
          return [prompt_type, selected_name]
        })
      ),
      selected_api_configuration_id_by_prompt_type: {
        'edit-files': this.extension_context.workspaceState.get<string>(
          LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY
        )
      }
    })
  }

  public set_undo_button_state = (can_undo: boolean) => {
    this.send_message({
      command: 'CAN_UNDO_CHANGED',
      can_undo
    })
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    return webview_html({
      webview,
      extension_uri: this.extension_uri,
      name: 'prompt',
      overflow_hidden: true
    })
  }

  public add_text_at_cursor_position(text: string, chars_to_remove_before = 0) {
    const target_state = this.active_instructions_state
    const current_instructions = this.current_instruction

    const before_caret = current_instructions.slice(
      0,
      this.caret_position - chars_to_remove_before
    )
    const after_caret = current_instructions.slice(this.caret_position)

    const new_instructions = (before_caret + text + after_caret).replace(
      /  +/g,
      ' '
    )
    const new_caret_position = (before_caret + text).replace(/  +/g, ' ').length

    target_state.instructions[target_state.active_index] = new_instructions
    this.caret_position = new_caret_position

    this.send_message({
      command: 'INSTRUCTIONS',
      ask_about_context: this.ask_about_context_instructions,
      edit_files: this.edit_files_instructions,
      caret_position: this.caret_position
    })
    this.send_token_count()
  }
}

import * as vscode from 'vscode'
import {
  BackendMessage,
  FrontendMessage
} from '@/views/settings/types/messages'
import {
  handle_add_model_provider,
  handle_update_model_provider,
  handle_delete_model_provider,
  handle_get_check_new_files,
  handle_get_clear_checks_in_workspace_behavior,
  handle_get_are_automatic_checkpoints_disabled,
  handle_get_api_configurations,
  handle_get_commit_message_instructions,
  handle_get_attach_ascii_tree_of_context,
  handle_get_include_prompts_in_commit_messages,
  handle_get_context_size_warning_threshold,
  handle_get_limit_semantic_search_results,
  handle_get_edit_files_system_instructions,
  handle_get_gemini_user_id,
  handle_get_ai_studio_user_id,
  handle_get_model_providers,
  handle_get_send_with_shift_enter,
  handle_get_reuse_last_tab,
  handle_update_checkpoint_lifespan,
  handle_get_checkpoint_lifespan,
  handle_reorder_model_providers,
  handle_set_default_api_configuration,
  handle_select_default_api_configuration,
  handle_update_check_new_files,
  handle_update_clear_checks_in_workspace_behavior,
  handle_update_are_automatic_checkpoints_disabled,
  handle_update_commit_message_instructions,
  handle_update_attach_ascii_tree_of_context,
  handle_update_include_prompts_in_commit_messages,
  handle_get_synchronize_edit_format_between_modes,
  handle_update_synchronize_edit_format_between_modes,
  handle_update_edit_files_system_instructions,
  handle_update_gemini_user_id,
  handle_update_context_size_warning_threshold,
  handle_update_limit_semantic_search_results,
  handle_update_ai_studio_user_id,
  handle_update_send_with_shift_enter,
  handle_update_reuse_last_tab,
  handle_open_ignore_patterns_settings,
  handle_open_allow_patterns_settings,
  handle_get_auto_run_intelligent_update,
  handle_update_auto_run_intelligent_update,
  handle_open_keybindings,
  handle_open_external_url,
  handle_delete_web_configuration,
  handle_reorder_web_configurations,
  handle_create_web_configuration,
  handle_pick_chatbot,
  handle_pick_model,
  handle_pick_reasoning_effort,
  handle_update_web_configuration,
  handle_create_api_configuration,
  handle_update_api_configuration,
  handle_delete_api_configuration,
  handle_reorder_api_configurations,
  handle_pick_model_provider,
  handle_pick_api_model,
  handle_pick_api_reasoning_effort,
  handle_get_intelligent_file_search_instructions,
  handle_update_intelligent_file_search_instructions,
  handle_get_templates,
  handle_update_templates,
  handle_create_template
} from './message-handlers'
import { config_web_configuration_to_ui_format } from '@/utils/web-configuration-format-converters'
import { webview_html } from '@/views/shared/utils/webview-html'

export class SettingsViewProvider {
  private _webview_panel: vscode.WebviewPanel | undefined
  private _disposables: vscode.Disposable[] = []
  private _pending_section_to_show: string | undefined

  constructor(
    private readonly _extensionUri: vscode.Uri,
    public readonly extension_context: vscode.ExtensionContext
  ) {}

  private _send_web_configurations() {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const web_configurations_config =
      config.get<any[]>('webConfigurations', []) || []

    this.postMessage({
      command: 'WEB_CONFIGURATIONS',
      web_configurations: web_configurations_config
        .filter((c: any) => c.chatbot)
        .map((c: any) => config_web_configuration_to_ui_format(c))
    })
  }

  private _send_is_modern_ui() {
    const config = vscode.workspace.getConfiguration('workbench')
    const is_modern_ui = config.get<boolean>('experimental.modernUI', false)
    this.postMessage({
      command: 'IS_MODERN_UI',
      is_modern_ui
    })
  }

  public createOrShow(section_to_show?: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (this._webview_panel) {
      this._webview_panel.reveal(column)
      if (section_to_show) {
        this.postMessage({
          command: 'SHOW_SECTION',
          section: section_to_show
        })
      }
      return
    }

    this._pending_section_to_show = section_to_show

    this._webview_panel = vscode.window.createWebviewPanel(
      'codeWebChatSettings',
      'Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri]
      }
    )

    this._webview_panel.iconPath = new vscode.ThemeIcon('gear') as any

    this._webview_panel.onDidDispose(() => {
      this._webview_panel = undefined
      this._disposables.forEach((d) => d.dispose())
      this._disposables = []
    }, null)

    this._webview_panel.webview.html = this._getHtmlForWebview(
      this._webview_panel.webview
    )

    this._webview_panel.webview.onDidReceiveMessage(
      async (message: FrontendMessage) => {
        if (message.command == 'SETTINGS_UI_READY') {
          if (this._pending_section_to_show) {
            this.postMessage({
              command: 'SHOW_SECTION',
              section: this._pending_section_to_show
            })
            this._pending_section_to_show = undefined
          }
        } else if (message.command == 'GET_MODEL_PROVIDERS') {
          await handle_get_model_providers(this)
        } else if (message.command == 'REORDER_MODEL_PROVIDERS') {
          await handle_reorder_model_providers(this, message)
        } else if (message.command == 'ADD_MODEL_PROVIDER') {
          await handle_add_model_provider(this, message)
        } else if (message.command == 'DELETE_MODEL_PROVIDER') {
          await handle_delete_model_provider(this, message)
        } else if (message.command == 'UPDATE_MODEL_PROVIDER') {
          await handle_update_model_provider(this, message)
        } else if (message.command == 'GET_TEMPLATES') {
          await handle_get_templates(this)
        } else if (message.command == 'UPDATE_TEMPLATES') {
          await handle_update_templates(message)
        } else if (message.command == 'CREATE_TEMPLATE') {
          await handle_create_template(this, message)
        } else if (message.command == 'GET_API_CONFIGURATIONS') {
          await handle_get_api_configurations(this)
        } else if (
          message.command == 'GET_INTELLIGENT_FILE_SEARCH_INSTRUCTIONS'
        ) {
          await handle_get_intelligent_file_search_instructions(this)
        } else if (
          message.command == 'UPDATE_INTELLIGENT_FILE_SEARCH_INSTRUCTIONS'
        ) {
          await handle_update_intelligent_file_search_instructions(message)
        } else if (message.command == 'SET_DEFAULT_API_CONFIGURATION') {
          await handle_set_default_api_configuration(
            this,
            message.api_configuration_id,
            message.api_feature
          )
        } else if (message.command == 'SELECT_DEFAULT_API_CONFIGURATION') {
          await handle_select_default_api_configuration(this, message)
        } else if (message.command == 'GET_EDIT_FILES_SYSTEM_INSTRUCTIONS') {
          await handle_get_edit_files_system_instructions(this)
        } else if (message.command == 'UPDATE_EDIT_FILES_SYSTEM_INSTRUCTIONS') {
          await handle_update_edit_files_system_instructions(message)
        } else if (message.command == 'GET_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handle_get_commit_message_instructions(this)
        } else if (message.command == 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handle_update_commit_message_instructions(message)
        } else if (message.command == 'GET_ATTACH_ASCII_TREE_OF_CONTEXT') {
          await handle_get_attach_ascii_tree_of_context(this)
        } else if (message.command == 'UPDATE_ATTACH_ASCII_TREE_OF_CONTEXT') {
          await handle_update_attach_ascii_tree_of_context(message)
        } else if (
          message.command ==
          'GET_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
        ) {
          await handle_get_include_prompts_in_commit_messages(this)
        } else if (
          message.command == 'GET_SYNCHRONIZE_EDIT_FORMAT_BETWEEN_MODES'
        ) {
          await handle_get_synchronize_edit_format_between_modes(this)
        } else if (
          message.command == 'UPDATE_SYNCHRONIZE_EDIT_FORMAT_BETWEEN_MODES'
        ) {
          await handle_update_synchronize_edit_format_between_modes(message)
        } else if (
          message.command ==
          'UPDATE_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
        ) {
          await handle_update_include_prompts_in_commit_messages(message)
        } else if (message.command == 'GET_CONTEXT_SIZE_WARNING_THRESHOLD') {
          await handle_get_context_size_warning_threshold(this)
        } else if (message.command == 'UPDATE_CONTEXT_SIZE_WARNING_THRESHOLD') {
          await handle_update_context_size_warning_threshold(message)
        } else if (message.command == 'GET_LIMIT_SEMANTIC_SEARCH_RESULTS') {
          await handle_get_limit_semantic_search_results(this)
        } else if (message.command == 'UPDATE_LIMIT_SEMANTIC_SEARCH_RESULTS') {
          await handle_update_limit_semantic_search_results(message)
        } else if (
          message.command == 'GET_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
        ) {
          await handle_get_clear_checks_in_workspace_behavior(this)
        } else if (
          message.command == 'UPDATE_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
        ) {
          await handle_update_clear_checks_in_workspace_behavior(message)
        } else if (message.command == 'GET_GEMINI_USER_ID') {
          await handle_get_gemini_user_id(this)
        } else if (message.command == 'UPDATE_GEMINI_USER_ID') {
          await handle_update_gemini_user_id(message)
        } else if (message.command == 'GET_AI_STUDIO_USER_ID') {
          await handle_get_ai_studio_user_id(this)
        } else if (message.command == 'UPDATE_AI_STUDIO_USER_ID') {
          await handle_update_ai_studio_user_id(message)
        } else if (message.command == 'GET_CHECKPOINT_LIFESPAN') {
          await handle_get_checkpoint_lifespan(this)
        } else if (message.command == 'GET_SEND_WITH_SHIFT_ENTER') {
          await handle_get_send_with_shift_enter(this)
        } else if (message.command == 'UPDATE_SEND_WITH_SHIFT_ENTER') {
          await handle_update_send_with_shift_enter(message)
        } else if (message.command == 'GET_CHECK_NEW_FILES') {
          await handle_get_check_new_files(this)
        } else if (message.command == 'UPDATE_CHECK_NEW_FILES') {
          await handle_update_check_new_files(message)
        } else if (message.command == 'GET_REUSE_LAST_TAB') {
          await handle_get_reuse_last_tab(this)
        } else if (message.command == 'UPDATE_REUSE_LAST_TAB') {
          await handle_update_reuse_last_tab(message)
        } else if (
          message.command == 'GET_ARE_AUTOMATIC_CHECKPOINTS_DISABLED'
        ) {
          await handle_get_are_automatic_checkpoints_disabled(this)
        } else if (
          message.command == 'UPDATE_ARE_AUTOMATIC_CHECKPOINTS_DISABLED'
        ) {
          await handle_update_are_automatic_checkpoints_disabled(message)
        } else if (message.command == 'UPDATE_CHECKPOINT_LIFESPAN') {
          await handle_update_checkpoint_lifespan(message)
        } else if (message.command == 'OPEN_EDITOR_SETTINGS') {
          await vscode.commands.executeCommand('workbench.action.openSettings')
        } else if (message.command == 'OPEN_IGNORE_PATTERNS_SETTINGS') {
          await handle_open_ignore_patterns_settings()
        } else if (message.command == 'OPEN_ALLOW_PATTERNS_SETTINGS') {
          await handle_open_allow_patterns_settings()
        } else if (message.command == 'GET_AUTO_RUN_INTELLIGENT_UPDATE') {
          await handle_get_auto_run_intelligent_update(this)
        } else if (message.command == 'UPDATE_AUTO_RUN_INTELLIGENT_UPDATE') {
          await handle_update_auto_run_intelligent_update(message)
        } else if (message.command == 'OPEN_KEYBINDINGS') {
          await handle_open_keybindings(message)
        } else if (message.command == 'OPEN_EXTERNAL_URL') {
          await handle_open_external_url(message)
        } else if (message.command == 'GET_WEB_CONFIGURATIONS') {
          this._send_web_configurations()
        } else if (message.command == 'REORDER_WEB_CONFIGURATIONS') {
          await handle_reorder_web_configurations(message)
        } else if (message.command == 'DELETE_WEB_CONFIGURATION') {
          await handle_delete_web_configuration(message.name)
        } else if (message.command == 'CREATE_WEB_CONFIGURATION') {
          await handle_create_web_configuration(this, message)
        } else if (message.command == 'PICK_CHATBOT') {
          await handle_pick_chatbot(this, message)
        } else if (message.command == 'PICK_MODEL') {
          await handle_pick_model(this, message)
        } else if (message.command == 'PICK_REASONING_EFFORT') {
          await handle_pick_reasoning_effort(this, message)
        } else if (message.command == 'UPDATE_WEB_CONFIGURATION') {
          await handle_update_web_configuration(this, message)
        } else if (message.command == 'CREATE_API_CONFIGURATION') {
          await handle_create_api_configuration(this, message)
        } else if (message.command == 'UPDATE_API_CONFIGURATION') {
          await handle_update_api_configuration(this, message)
        } else if (message.command == 'DELETE_API_CONFIGURATION') {
          await handle_delete_api_configuration(this, message)
        } else if (message.command == 'REORDER_API_CONFIGURATIONS') {
          await handle_reorder_api_configurations(this, message)
        } else if (message.command == 'PICK_MODEL_PROVIDER') {
          await handle_pick_model_provider(this, message)
        } else if (message.command == 'PICK_API_MODEL') {
          await handle_pick_api_model(this, message)
        } else if (message.command == 'PICK_API_REASONING_EFFORT') {
          await handle_pick_api_reasoning_effort(this, message)
        } else if (message.command == 'GET_IS_MODERN_UI') {
          this._send_is_modern_ui()
        }
      },
      null,
      this._disposables
    )

    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('codeWebChat')) {
          void handle_get_model_providers(this)
          void handle_get_api_configurations(this)
          void handle_get_edit_files_system_instructions(this)
          void handle_get_intelligent_file_search_instructions(this)
          void handle_get_context_size_warning_threshold(this)
          void handle_get_limit_semantic_search_results(this)
          void handle_get_commit_message_instructions(this)
          void handle_get_attach_ascii_tree_of_context(this)
          void handle_get_include_prompts_in_commit_messages(this)
          void handle_get_synchronize_edit_format_between_modes(this)
          void handle_get_clear_checks_in_workspace_behavior(this)
          void handle_get_are_automatic_checkpoints_disabled(this)
          void handle_get_checkpoint_lifespan(this)
          void handle_get_gemini_user_id(this)
          void handle_get_ai_studio_user_id(this)
          void handle_get_send_with_shift_enter(this)
          void handle_get_check_new_files(this)
          void handle_get_reuse_last_tab(this)
          void handle_get_auto_run_intelligent_update(this)
          void handle_get_templates(this)
          this._send_web_configurations()
        }
        if (e.affectsConfiguration('workbench.experimental.modernUI')) {
          this._send_is_modern_ui()
        }
      })
    )
  }

  public postMessage(message: BackendMessage) {
    if (this._webview_panel) {
      this._webview_panel.webview.postMessage(message)
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return webview_html({
      webview,
      extension_uri: this._extensionUri,
      name: 'settings',
      title: 'Settings'
    })
  }
}

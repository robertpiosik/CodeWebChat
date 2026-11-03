import * as vscode from 'vscode'
import {
  BackendMessage,
  FrontendMessage
} from '@/views/settings/types/messages'
import * as handlers from './message-handlers'
import { webview_html } from '@/views/shared/utils/webview-html'

export class SettingsViewProvider {
  private _webview_panel: vscode.WebviewPanel | undefined
  private _disposables: vscode.Disposable[] = []
  private _pending_section_to_show: string | undefined

  constructor(
    private readonly _extensionUri: vscode.Uri,
    public readonly extension_context: vscode.ExtensionContext
  ) {}

  createOrShow(section_to_show?: string) {
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
        if (message.command === 'SETTINGS_UI_READY') {
          if (this._pending_section_to_show) {
            this.postMessage({
              command: 'SHOW_SECTION',
              section: this._pending_section_to_show
            })
            this._pending_section_to_show = undefined
          }
        } else if (message.command === 'GET_PROVIDERS') {
          await handlers.handle_get_providers(this)
        } else if (message.command === 'REORDER_PROVIDERS') {
          await handlers.handle_reorder_providers(this, message)
        } else if (message.command === 'ADD_PROVIDER') {
          await handlers.handle_add_provider(this, message)
        } else if (message.command === 'DELETE_PROVIDER') {
          await handlers.handle_delete_provider(this, message)
        } else if (message.command === 'UPDATE_PROVIDER') {
          await handlers.handle_update_provider(this, message)
        } else if (message.command === 'TEST_PROVIDER_CONNECTION') {
          await handlers.handle_test_provider_connection(this, message)
        } else if (message.command === 'SHOW_HASH_SIGN_QUICK_PICK') {
          await handlers.handle_hash_sign_quick_pick(this, message)
        } else if (message.command === 'GET_PROMPT_INSTRUCTIONS') {
          await handlers.handle_get_prompt_instructions(this)
        } else if (message.command === 'UPDATE_PROMPT_INSTRUCTIONS') {
          await handlers.handle_update_prompt_instructions(message)
        } else if (message.command === 'CREATE_PROMPT_INSTRUCTION') {
          await handlers.handle_create_prompt_instruction(this, message)
        } else if (message.command === 'DELETE_PROMPT_INSTRUCTION') {
          await handlers.handle_delete_prompt_instruction(this, message)
        } else if (message.command === 'CANCEL_PROMPT_INSTRUCTION_EDIT') {
          await handlers.handle_cancel_prompt_instruction_edit(this, message)
        } else if (message.command === 'GET_API_CONFIGURATIONS') {
          await handlers.handle_get_api_configurations(this)
        } else if (message.command === 'SET_DEFAULT_API_CONFIGURATION') {
          await handlers.handle_set_default_api_configuration(
            this,
            message.api_configuration_id,
            message.api_feature
          )
        } else if (message.command === 'SELECT_DEFAULT_API_CONFIGURATION') {
          await handlers.handle_select_default_api_configuration(this, message)
        } else if (message.command === 'GET_EDIT_FILES_SYSTEM_INSTRUCTIONS') {
          await handlers.handle_get_edit_files_system_instructions(this)
        } else if (
          message.command === 'UPDATE_EDIT_FILES_SYSTEM_INSTRUCTIONS'
        ) {
          await handlers.handle_update_edit_files_system_instructions(message)
        } else if (message.command === 'GET_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handlers.handle_get_commit_message_instructions(this)
        } else if (message.command === 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handlers.handle_update_commit_message_instructions(message)
        } else if (message.command === 'GET_ATTACH_ASCII_TREE_OF_CONTEXT') {
          await handlers.handle_get_attach_ascii_tree_of_context(this)
        } else if (message.command === 'UPDATE_ATTACH_ASCII_TREE_OF_CONTEXT') {
          await handlers.handle_update_attach_ascii_tree_of_context(message)
        } else if (
          message.command === 'GET_USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT'
        ) {
          await handlers.handle_get_use_context_files_in_commit_message_prompt(this)
        } else if (
          message.command ===
          'UPDATE_USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT'
        ) {
          await handlers.handle_update_use_context_files_in_commit_message_prompt(
            message
          )
        } else if (
          message.command ==
          'GET_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
        ) {
          await handlers.handle_get_include_prompts_in_commit_messages(this)
        } else if (
          message.command ==
          'UPDATE_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
        ) {
          await handlers.handle_update_include_prompts_in_commit_messages(message)
        } else if (message.command === 'GET_DEFAULT_OPTION_FOR_VOICE_INPUT') {
          await handlers.handle_get_default_option_for_voice_input(this)
        } else if (
          message.command === 'UPDATE_DEFAULT_OPTION_FOR_VOICE_INPUT'
        ) {
          await handlers.handle_update_default_option_for_voice_input(message)
        } else if (message.command === 'GET_VOICE_INPUT_INSTRUCTIONS') {
          await handlers.handle_get_voice_input_instructions(this)
        } else if (message.command === 'UPDATE_VOICE_INPUT_INSTRUCTIONS') {
          await handlers.handle_update_voice_input_instructions(message)
        } else if (message.command === 'GET_AGENTIC_SEARCH_INSTRUCTIONS') {
          await handlers.handle_get_agentic_search_instructions(this)
        } else if (message.command === 'UPDATE_AGENTIC_SEARCH_INSTRUCTIONS') {
          await handlers.handle_update_agentic_search_instructions(message)
        } else if (message.command === 'GET_AGENTIC_SEARCH_INVOCATION_COUNT') {
          await handlers.handle_get_agentic_search_invocation_count(this)
        } else if (
          message.command === 'UPDATE_AGENTIC_SEARCH_INVOCATION_COUNT'
        ) {
          await handlers.handle_update_agentic_search_invocation_count(message)
        } else if (message.command === 'GET_GEMINI_USER_ID') {
          await handlers.handle_get_gemini_user_id(this)
        } else if (message.command === 'UPDATE_GEMINI_USER_ID') {
          await handlers.handle_update_gemini_user_id(message)
        } else if (message.command === 'GET_AI_STUDIO_USER_ID') {
          await handlers.handle_get_ai_studio_user_id(this)
        } else if (message.command === 'UPDATE_AI_STUDIO_USER_ID') {
          await handlers.handle_update_ai_studio_user_id(message)
        } else if (message.command === 'GET_SEND_WITH_SHIFT_ENTER') {
          await handlers.handle_get_send_with_shift_enter(this)
        } else if (message.command === 'UPDATE_SEND_WITH_SHIFT_ENTER') {
          await handlers.handle_update_send_with_shift_enter(message)
        } else if (message.command === 'OPEN_EDITOR_SETTINGS') {
          await handlers.handle_open_editor_settings()
        } else if (message.command === 'OPEN_IGNORE_PATTERNS_SETTINGS') {
          await handlers.handle_open_ignore_patterns_settings()
        } else if (message.command === 'OPEN_ALLOW_PATTERNS_SETTINGS') {
          await handlers.handle_open_allow_patterns_settings()
        } else if (message.command === 'OPEN_KEYBINDINGS') {
          await handlers.handle_open_keybindings(message)
        } else if (message.command === 'GET_CLI_CONFIGURATIONS') {
          await handlers.handle_get_cli_configurations(this)
        } else if (message.command === 'CREATE_CLI_CONFIGURATION') {
          await handlers.handle_create_cli_configuration(this, message)
        } else if (message.command === 'DELETE_CLI_CONFIGURATION') {
          await handlers.handle_delete_cli_configuration(message.name)
        } else if (message.command === 'UPDATE_CLI_CONFIGURATION') {
          await handlers.handle_update_cli_configuration(this, message)
        } else if (message.command === 'REORDER_CLI_CONFIGURATIONS') {
          await handlers.handle_reorder_cli_configurations(message)
        } else if (message.command === 'PICK_AGENT') {
          await handlers.handle_pick_agent(this, message)
        } else if (message.command === 'PICK_EXAMPLE_FLAGS') {
          await handlers.handle_pick_example_flags(this, message)
        } else if (message.command === 'GET_FORWARDED_PORTS') {
          await handlers.handle_get_forwarded_ports(this)
        } else if (message.command === 'UPDATE_FORWARDED_PORTS') {
          await handlers.handle_update_forwarded_ports(message)
        } else if (message.command === 'GET_WEB_CONFIGURATIONS') {
          await handlers.handle_get_web_configurations(this)
        } else if (message.command === 'REORDER_WEB_CONFIGURATIONS') {
          await handlers.handle_reorder_web_configurations(message)
        } else if (message.command === 'DELETE_WEB_CONFIGURATION') {
          await handlers.handle_delete_web_configuration(message.name)
        } else if (message.command === 'CREATE_WEB_CONFIGURATION') {
          await handlers.handle_create_web_configuration(this, message)
        } else if (message.command === 'PICK_CHATBOT') {
          await handlers.handle_pick_chatbot(this, message)
        } else if (message.command === 'PICK_MODEL') {
          await handlers.handle_pick_model(this, message)
        } else if (message.command === 'PICK_REASONING_EFFORT') {
          await handlers.handle_pick_reasoning_effort(this, message)
        } else if (message.command === 'UPDATE_WEB_CONFIGURATION') {
          await handlers.handle_update_web_configuration(this, message)
        } else if (message.command === 'SET_DEFAULT_WEB_CONFIGURATION') {
          await handlers.handle_set_default_web_configuration(message)
        } else if (message.command === 'SELECT_DEFAULT_WEB_CONFIGURATION') {
          await handlers.handle_select_default_web_configuration(message)
        } else if (message.command === 'CREATE_API_CONFIGURATION') {
          await handlers.handle_create_api_configuration(this, message)
        } else if (message.command === 'UPDATE_API_CONFIGURATION') {
          await handlers.handle_update_api_configuration(this, message)
        } else if (message.command === 'DELETE_API_CONFIGURATION') {
          await handlers.handle_delete_api_configuration(this, message)
        } else if (message.command === 'REORDER_API_CONFIGURATIONS') {
          await handlers.handle_reorder_api_configurations(this, message)
        } else if (message.command === 'PICK_PROVIDER') {
          await handlers.handle_pick_provider(this, message)
        } else if (message.command === 'PICK_API_MODEL') {
          await handlers.handle_pick_api_model(this, message)
        } else if (message.command === 'PICK_API_REASONING_EFFORT') {
          await handlers.handle_pick_api_reasoning_effort(this, message)
        } else if (message.command === 'SET_DEFAULT_CLI_CONFIGURATION') {
          await handlers.handle_set_default_cli_configuration(message)
        } else if (message.command === 'SELECT_DEFAULT_CLI_CONFIGURATION') {
          await handlers.handle_select_default_cli_configuration(message)
        } else if (message.command === 'GET_IS_MODERN_UI') {
          await handlers.handle_get_is_modern_ui(this)
        }
      },
      null,
      this._disposables
    )

    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('codeWebChat')) {
          void handlers.handle_get_providers(this)
          void handlers.handle_get_api_configurations(this)
          void handlers.handle_get_edit_files_system_instructions(this)
          void handlers.handle_get_commit_message_instructions(this)
          void handlers.handle_get_attach_ascii_tree_of_context(this)
          void handlers.handle_get_use_context_files_in_commit_message_prompt(this)
          void handlers.handle_get_include_prompts_in_commit_messages(this)
          void handlers.handle_get_default_option_for_voice_input(this)
          void handlers.handle_get_voice_input_instructions(this)
          void handlers.handle_get_agentic_search_instructions(this)
          void handlers.handle_get_agentic_search_invocation_count(this)
          void handlers.handle_get_gemini_user_id(this)
          void handlers.handle_get_ai_studio_user_id(this)
          void handlers.handle_get_send_with_shift_enter(this)
          void handlers.handle_get_prompt_instructions(this)
          void handlers.handle_get_forwarded_ports(this)
          void handlers.handle_get_web_configurations(this)
          void handlers.handle_get_cli_configurations(this)
        }
        if (e.affectsConfiguration('workbench.experimental.modernUI')) {
          void handlers.handle_get_is_modern_ui(this)
        }
      })
    )
  }

  postMessage(message: BackendMessage) {
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

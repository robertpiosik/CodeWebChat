import * as vscode from 'vscode'
import {
  BackendMessage,
  FrontendMessage
} from '@/views/settings/types/messages'
import {
  handle_add_code_completions_configuration,
  handle_add_commit_messages_configuration,
  handle_add_edit_context_configuration,
  handle_add_intelligent_update_configuration,
  handle_add_model_provider,
  handle_change_model_provider_key,
  handle_delete_code_completions_configuration,
  handle_delete_commit_messages_configuration,
  handle_delete_edit_context_configuration,
  handle_delete_intelligent_update_configuration,
  handle_delete_model_provider,
  handle_edit_code_completions_configuration,
  handle_edit_commit_messages_configuration,
  handle_edit_custom_model_provider,
  handle_edit_edit_context_configuration,
  handle_edit_intelligent_update_configuration,
  handle_get_clear_checks_in_workspace_behavior,
  handle_get_code_completions_configurations,
  handle_get_commit_message_instructions,
  handle_get_commit_message_auto_accept_after,
  handle_get_commit_messages_configurations,
  handle_get_context_size_warning_threshold,
  handle_get_edit_context_configurations,
  handle_get_edit_context_system_instructions,
  handle_get_edit_format_instructions,
  handle_get_gemini_user_id,
  handle_get_intelligent_update_configurations,
  handle_get_model_providers,
  handle_get_checkpoint_lifespan,
  handle_reorder_code_completions_configurations,
  handle_reorder_commit_messages_configurations,
  handle_reorder_edit_context_configurations,
  handle_reorder_intelligent_update_configurations,
  handle_reorder_model_providers,
  handle_set_default_code_completions_configuration,
  handle_set_default_commit_messages_configuration,
  handle_set_default_intelligent_update_configuration,
  handle_update_clear_checks_in_workspace_behavior,
  handle_update_commit_message_instructions,
  handle_update_commit_message_auto_accept_after,
  handle_update_context_size_warning_threshold,
  handle_update_edit_context_system_instructions,
  handle_update_edit_format_instructions,
  handle_update_gemini_user_id
} from './message-handlers'

export class SettingsProvider {
  private _webview_panel: vscode.WebviewPanel | undefined
  private _disposables: vscode.Disposable[] = []
  private _pending_section_to_show: string | undefined

  constructor(
    private readonly _extensionUri: vscode.Uri,
    public readonly context: vscode.ExtensionContext
  ) {}

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
        localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'out')]
      }
    )

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
          await handle_add_model_provider(this)
        } else if (message.command == 'DELETE_MODEL_PROVIDER') {
          await handle_delete_model_provider(this, message)
        } else if (message.command == 'EDIT_CUSTOM_MODEL_PROVIDER') {
          await handle_edit_custom_model_provider(this, message)
        } else if (message.command == 'CHANGE_MODEL_PROVIDER_KEY') {
          await handle_change_model_provider_key(this, message)
        } else if (message.command == 'GET_CODE_COMPLETIONS_CONFIGURATIONS') {
          await handle_get_code_completions_configurations(this)
        } else if (
          message.command == 'REORDER_CODE_COMPLETIONS_CONFIGURATIONS'
        ) {
          await handle_reorder_code_completions_configurations(this, message)
        } else if (message.command == 'DELETE_CODE_COMPLETIONS_CONFIGURATION') {
          await handle_delete_code_completions_configuration(this, message)
        } else if (message.command == 'ADD_CODE_COMPLETIONS_CONFIGURATION') {
          await handle_add_code_completions_configuration(this)
        } else if (message.command == 'EDIT_CODE_COMPLETIONS_CONFIGURATION') {
          await handle_edit_code_completions_configuration(this, message)
        } else if (
          message.command == 'SET_DEFAULT_CODE_COMPLETIONS_CONFIGURATION'
        ) {
          await handle_set_default_code_completions_configuration(this, message)
        } else if (message.command == 'GET_EDIT_CONTEXT_CONFIGURATIONS') {
          await handle_get_edit_context_configurations(this)
        } else if (message.command == 'REORDER_EDIT_CONTEXT_CONFIGURATIONS') {
          await handle_reorder_edit_context_configurations(this, message)
        } else if (message.command == 'DELETE_EDIT_CONTEXT_CONFIGURATION') {
          await handle_delete_edit_context_configuration(this, message)
        } else if (message.command == 'ADD_EDIT_CONTEXT_CONFIGURATION') {
          await handle_add_edit_context_configuration(this)
        } else if (message.command == 'EDIT_EDIT_CONTEXT_CONFIGURATION') {
          await handle_edit_edit_context_configuration(this, message)
        } else if (message.command == 'GET_EDIT_CONTEXT_SYSTEM_INSTRUCTIONS') {
          await handle_get_edit_context_system_instructions(this)
        } else if (
          message.command == 'UPDATE_EDIT_CONTEXT_SYSTEM_INSTRUCTIONS'
        ) {
          await handle_update_edit_context_system_instructions(message)
        } else if (
          message.command == 'GET_EDIT_FORMAT_INSTRUCTIONS'
        ) {
          await handle_get_edit_format_instructions(this)
        } else if (message.command == 'UPDATE_EDIT_FORMAT_INSTRUCTIONS') {
          await handle_update_edit_format_instructions(message)
        } else if (message.command == 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS') {
          await handle_get_intelligent_update_configurations(this)
        } else if (
          message.command == 'REORDER_INTELLIGENT_UPDATE_CONFIGURATIONS'
        ) {
          await handle_reorder_intelligent_update_configurations(this, message)
        } else if (
          message.command == 'DELETE_INTELLIGENT_UPDATE_CONFIGURATION'
        ) {
          await handle_delete_intelligent_update_configuration(this, message)
        } else if (message.command == 'ADD_INTELLIGENT_UPDATE_CONFIGURATION') {
          await handle_add_intelligent_update_configuration(this)
        } else if (message.command == 'EDIT_INTELLIGENT_UPDATE_CONFIGURATION') {
          await handle_edit_intelligent_update_configuration(this, message)
        } else if (
          message.command == 'SET_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION'
        ) {
          await handle_set_default_intelligent_update_configuration(
            this,
            message
          )
        } else if (message.command == 'GET_COMMIT_MESSAGES_CONFIGURATIONS') {
          await handle_get_commit_messages_configurations(this)
        } else if (
          message.command == 'REORDER_COMMIT_MESSAGES_CONFIGURATIONS'
        ) {
          await handle_reorder_commit_messages_configurations(this, message)
        } else if (message.command == 'DELETE_COMMIT_MESSAGES_CONFIGURATION') {
          await handle_delete_commit_messages_configuration(this, message)
        } else if (message.command == 'ADD_COMMIT_MESSAGES_CONFIGURATION') {
          await handle_add_commit_messages_configuration(this)
        } else if (message.command == 'EDIT_COMMIT_MESSAGES_CONFIGURATION') {
          await handle_edit_commit_messages_configuration(this, message)
        } else if (
          message.command == 'SET_DEFAULT_COMMIT_MESSAGES_CONFIGURATION'
        ) {
          await handle_set_default_commit_messages_configuration(this, message)
        } else if (message.command == 'GET_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handle_get_commit_message_instructions(this)
        } else if (message.command == 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS') {
          await handle_update_commit_message_instructions(this, message)
        } else if (message.command == 'GET_COMMIT_MESSAGE_AUTO_ACCEPT_AFTER') {
          await handle_get_commit_message_auto_accept_after(this)
        } else if (
          message.command == 'UPDATE_COMMIT_MESSAGE_AUTO_ACCEPT_AFTER'
        ) {
          await handle_update_commit_message_auto_accept_after(message)
        } else if (message.command == 'GET_CONTEXT_SIZE_WARNING_THRESHOLD') {
          await handle_get_context_size_warning_threshold(this)
        } else if (message.command == 'UPDATE_CONTEXT_SIZE_WARNING_THRESHOLD') {
          await handle_update_context_size_warning_threshold(this, message)
        } else if (
          message.command == 'GET_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
        ) {
          await handle_get_clear_checks_in_workspace_behavior(this)
        } else if (
          message.command == 'UPDATE_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
        ) {
          await handle_update_clear_checks_in_workspace_behavior(this, message)
        } else if (message.command == 'GET_GEMINI_USER_ID') {
          await handle_get_gemini_user_id(this)
        } else if (message.command == 'UPDATE_GEMINI_USER_ID') {
          await handle_update_gemini_user_id(this, message)
        } else if (message.command == 'GET_CHECKPOINT_LIFESPAN') {
          await handle_get_checkpoint_lifespan(this)
        } else if (message.command == 'UPDATE_CHECKPOINT_LIFESPAN') {
          await vscode.workspace
            .getConfiguration('codeWebChat')
            .update(
              'checkpointLifespan',
              message.hours,
              vscode.ConfigurationTarget.Global
            )
        } else if (message.command == 'OPEN_EDITOR_SETTINGS') {
          await vscode.commands.executeCommand('workbench.action.openSettings')
        }
      },
      null,
      this._disposables
    )

    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('codeWebChat')) {
          void handle_get_model_providers(this)
          void handle_get_code_completions_configurations(this)
          void handle_get_commit_messages_configurations(this)
          void handle_get_edit_context_configurations(this)
          void handle_get_edit_context_system_instructions(this)
          void handle_get_edit_format_instructions(this)
          void handle_get_intelligent_update_configurations(this)
          void handle_get_context_size_warning_threshold(this)
          void handle_get_commit_message_instructions(this)
          void handle_get_commit_message_auto_accept_after(this)
          void handle_get_clear_checks_in_workspace_behavior(this)
          void handle_get_checkpoint_lifespan(this)
          void handle_get_gemini_user_id(this)
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
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'settings.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'settings.css')
    )

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="${styleUri}">
      <title>Settings</title>
    </head>
    <body>
      <div id="root"></div>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `
  }
}

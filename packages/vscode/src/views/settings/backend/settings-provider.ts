import * as vscode from 'vscode'
import {
  BackendMessage,
  FrontendMessage
} from '@/views/settings/types/messages'
import {
  handle_get_api_providers,
  handle_reorder_api_providers,
  handle_add_api_provider,
  handle_delete_api_provider,
  handle_rename_api_provider,
  handle_change_api_provider_key,
  handle_get_code_completions_configurations,
  handle_reorder_code_completions_configurations,
  handle_delete_code_completions_configuration,
  handle_add_code_completions_configuration,
  handle_edit_code_completions_configuration,
  handle_set_default_code_completions_configuration,
  handle_get_commit_messages_configurations,
  handle_reorder_commit_messages_configurations,
  handle_delete_commit_messages_configuration,
  handle_add_commit_messages_configuration,
  handle_edit_commit_messages_configuration,
  handle_set_default_commit_messages_configuration,
  handle_get_edit_context_configurations,
  handle_reorder_edit_context_configurations,
  handle_delete_edit_context_configuration,
  handle_add_edit_context_configuration,
  handle_edit_edit_context_configuration,
  handle_get_intelligent_update_configurations,
  handle_reorder_intelligent_update_configurations,
  handle_delete_intelligent_update_configuration,
  handle_add_intelligent_update_configuration,
  handle_edit_intelligent_update_configuration,
  handle_set_default_intelligent_update_configuration
} from './message-handlers'

export class SettingsProvider {
  private _panel: vscode.WebviewPanel | undefined
  private readonly _disposables: vscode.Disposable[] = []

  constructor(
    private readonly _extensionUri: vscode.Uri,
    public readonly context: vscode.ExtensionContext
  ) {}

  public createOrShow() {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (this._panel) {
      this._panel.reveal(column)
      return
    }

    this._panel = vscode.window.createWebviewPanel(
      'codeWebChatSettings',
      'Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'out')]
      }
    )

    this._panel.onDidDispose(
      () => {
        this._panel = undefined
        this._disposables.forEach((d) => d.dispose())
      },
      null,
      this._disposables
    )

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview)

    this._panel.webview.onDidReceiveMessage(
      (message: FrontendMessage) => {
        switch (message.command) {
          case 'GET_API_PROVIDERS':
            void handle_get_api_providers(this)
            break
          case 'REORDER_API_PROVIDERS':
            void handle_reorder_api_providers(this, message)
            break
          case 'ADD_API_PROVIDER':
            void handle_add_api_provider(this)
            break
          case 'DELETE_API_PROVIDER':
            void handle_delete_api_provider(this, message)
            break
          case 'RENAME_API_PROVIDER':
            void handle_rename_api_provider(this, message)
            break
          case 'CHANGE_API_PROVIDER_KEY':
            void handle_change_api_provider_key(this, message)
            break
          case 'GET_CODE_COMPLETIONS_CONFIGURATIONS':
            void handle_get_code_completions_configurations(this)
            break
          case 'REORDER_CODE_COMPLETIONS_CONFIGURATIONS':
            void handle_reorder_code_completions_configurations(this, message)
            break
          case 'DELETE_CODE_COMPLETIONS_CONFIGURATION':
            void handle_delete_code_completions_configuration(this, message)
            break
          case 'ADD_CODE_COMPLETIONS_CONFIGURATION':
            void handle_add_code_completions_configuration(this)
            break
          case 'EDIT_CODE_COMPLETIONS_CONFIGURATION':
            void handle_edit_code_completions_configuration(this, message)
            break
          case 'SET_DEFAULT_CODE_COMPLETIONS_CONFIGURATION':
            void handle_set_default_code_completions_configuration(
              this,
              message
            )
            break
          case 'GET_EDIT_CONTEXT_CONFIGURATIONS':
            void handle_get_edit_context_configurations(this)
            break
          case 'REORDER_EDIT_CONTEXT_CONFIGURATIONS':
            void handle_reorder_edit_context_configurations(this, message)
            break
          case 'DELETE_EDIT_CONTEXT_CONFIGURATION':
            void handle_delete_edit_context_configuration(this, message)
            break
          case 'ADD_EDIT_CONTEXT_CONFIGURATION':
            void handle_add_edit_context_configuration(this)
            break
          case 'EDIT_EDIT_CONTEXT_CONFIGURATION':
            void handle_edit_edit_context_configuration(this, message)
            break
          case 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS':
            void handle_get_intelligent_update_configurations(this)
            break
          case 'REORDER_INTELLIGENT_UPDATE_CONFIGURATIONS':
            void handle_reorder_intelligent_update_configurations(this, message)
            break
          case 'DELETE_INTELLIGENT_UPDATE_CONFIGURATION':
            void handle_delete_intelligent_update_configuration(this, message)
            break
          case 'ADD_INTELLIGENT_UPDATE_CONFIGURATION':
            void handle_add_intelligent_update_configuration(this)
            break
          case 'EDIT_INTELLIGENT_UPDATE_CONFIGURATION':
            void handle_edit_intelligent_update_configuration(this, message)
            break
          case 'SET_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION':
            void handle_set_default_intelligent_update_configuration(
              this,
              message
            )
            break
          case 'GET_COMMIT_MESSAGES_CONFIGURATIONS':
            void handle_get_commit_messages_configurations(this)
            break
          case 'REORDER_COMMIT_MESSAGES_CONFIGURATIONS':
            void handle_reorder_commit_messages_configurations(this, message)
            break
          case 'DELETE_COMMIT_MESSAGES_CONFIGURATION':
            void handle_delete_commit_messages_configuration(this, message)
            break
          case 'ADD_COMMIT_MESSAGES_CONFIGURATION':
            void handle_add_commit_messages_configuration(this)
            break
          case 'EDIT_COMMIT_MESSAGES_CONFIGURATION':
            void handle_edit_commit_messages_configuration(this, message)
            break
          case 'SET_DEFAULT_COMMIT_MESSAGES_CONFIGURATION':
            void handle_set_default_commit_messages_configuration(this, message)
            break
        }
      },
      null,
      this._disposables
    )
  }

  public postMessage(message: BackendMessage) {
    if (this._panel) {
      this._panel.webview.postMessage(message)
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

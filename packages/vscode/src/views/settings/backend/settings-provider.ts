import * as vscode from 'vscode'
import {
  BackendMessage,
  FrontendMessage
} from '@/views/settings/types/messages'
import {
  handle_get_model_providers,
  handle_reorder_model_providers,
  handle_add_model_provider,
  handle_delete_model_provider,
  handle_rename_model_provider,
  handle_change_model_provider_key,
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
        switch (message.command) {
          case 'SETTINGS_UI_READY':
            if (this._pending_section_to_show) {
              this.postMessage({
                command: 'SHOW_SECTION',
                section: this._pending_section_to_show
              })
              this._pending_section_to_show = undefined
            }
            break
          case 'GET_MODEL_PROVIDERS':
            await handle_get_model_providers(this)
            break
          case 'REORDER_MODEL_PROVIDERS':
            await handle_reorder_model_providers(this, message)
            break
          case 'ADD_MODEL_PROVIDER':
            await handle_add_model_provider(this)
            break
          case 'DELETE_MODEL_PROVIDER':
            await handle_delete_model_provider(this, message)
            break
          case 'RENAME_MODEL_PROVIDER':
            await handle_rename_model_provider(this, message)
            break
          case 'CHANGE_MODEL_PROVIDER_KEY':
            await handle_change_model_provider_key(this, message)
            break
          case 'GET_CODE_COMPLETIONS_CONFIGURATIONS':
            await handle_get_code_completions_configurations(this)
            break
          case 'REORDER_CODE_COMPLETIONS_CONFIGURATIONS':
            await handle_reorder_code_completions_configurations(this, message)
            break
          case 'DELETE_CODE_COMPLETIONS_CONFIGURATION':
            await handle_delete_code_completions_configuration(this, message)
            break
          case 'ADD_CODE_COMPLETIONS_CONFIGURATION':
            await handle_add_code_completions_configuration(this)
            break
          case 'EDIT_CODE_COMPLETIONS_CONFIGURATION':
            await handle_edit_code_completions_configuration(this, message)
            break
          case 'SET_DEFAULT_CODE_COMPLETIONS_CONFIGURATION':
            await handle_set_default_code_completions_configuration(
              this,
              message
            )
            break
          case 'GET_EDIT_CONTEXT_CONFIGURATIONS':
            await handle_get_edit_context_configurations(this)
            break
          case 'REORDER_EDIT_CONTEXT_CONFIGURATIONS':
            await handle_reorder_edit_context_configurations(this, message)
            break
          case 'DELETE_EDIT_CONTEXT_CONFIGURATION':
            await handle_delete_edit_context_configuration(this, message)
            break
          case 'ADD_EDIT_CONTEXT_CONFIGURATION':
            await handle_add_edit_context_configuration(this)
            break
          case 'EDIT_EDIT_CONTEXT_CONFIGURATION':
            await handle_edit_edit_context_configuration(this, message)
            break
          case 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS':
            await handle_get_intelligent_update_configurations(this)
            break
          case 'REORDER_INTELLIGENT_UPDATE_CONFIGURATIONS':
            await handle_reorder_intelligent_update_configurations(
              this,
              message
            )
            break
          case 'DELETE_INTELLIGENT_UPDATE_CONFIGURATION':
            await handle_delete_intelligent_update_configuration(this, message)
            break
          case 'ADD_INTELLIGENT_UPDATE_CONFIGURATION':
            await handle_add_intelligent_update_configuration(this)

            break
          case 'EDIT_INTELLIGENT_UPDATE_CONFIGURATION':
            await handle_edit_intelligent_update_configuration(this, message)
            break
          case 'SET_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION':
            await handle_set_default_intelligent_update_configuration(
              this,
              message
            )
            break
          case 'GET_COMMIT_MESSAGES_CONFIGURATIONS':
            await handle_get_commit_messages_configurations(this)
            break
          case 'REORDER_COMMIT_MESSAGES_CONFIGURATIONS':
            await handle_reorder_commit_messages_configurations(this, message)
            break
          case 'DELETE_COMMIT_MESSAGES_CONFIGURATION':
            await handle_delete_commit_messages_configuration(this, message)
            break
          case 'ADD_COMMIT_MESSAGES_CONFIGURATION':
            await handle_add_commit_messages_configuration(this)
            break
          case 'EDIT_COMMIT_MESSAGES_CONFIGURATION':
            await handle_edit_commit_messages_configuration(this, message)
            break
          case 'SET_DEFAULT_COMMIT_MESSAGES_CONFIGURATION':
            await handle_set_default_commit_messages_configuration(
              this,
              message
            )
            break
          case 'GET_COMMIT_MESSAGE_INSTRUCTIONS': {
            const config = vscode.workspace.getConfiguration('codeWebChat')
            const instructions =
              config.get<string>('commitMessageInstructions') || ''
            this.postMessage({
              command: 'COMMIT_MESSAGE_INSTRUCTIONS',
              instructions
            })
            break
          }
          case 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS':
            await vscode.workspace
              .getConfiguration('codeWebChat')
              .update(
                'commitMessageInstructions',
                message.instructions,
                vscode.ConfigurationTarget.Global
              )
            break
          case 'OPEN_EDITOR_SETTINGS':
            await vscode.commands.executeCommand(
              'workbench.action.openSettings'
            )
            break
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
          void handle_get_intelligent_update_configurations(this)
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

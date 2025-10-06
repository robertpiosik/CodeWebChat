import * as vscode from 'vscode'
import { context_initialization } from './context/context-initialization'
import { ViewProvider } from './views/panel/backend/view-provider'
import { WebSocketManager } from './services/websocket-manager'
import {
  migrate_preset_is_default_to_is_selected,
  migrate_api_providers_to_model_providers,
  migrate_state_to_settings
} from './migrations'
import {
  apply_chat_response_command,
  code_completion_commands,
  close_editor_command,
  close_all_editors_command,
  save_all_command,
  new_file_command,
  open_file_from_workspace_command,
  new_folder_command,
  rename_command,
  delete_command,
  save_context_command,
  undo_command,
  generate_commit_message_command,
  reference_in_chat_command,
  apply_code_block_to_active_editor_command,
  open_url_command,
  feedback_command,
  apply_context_from_clipboard_command
} from './commands'
import { SettingsProvider } from './views/settings/backend/settings-provider'

// Store WebSocketServer instance at module level
let websocket_server_instance: WebSocketManager | null = null

export async function activate(context: vscode.ExtensionContext) {
  const { workspace_provider, open_editors_provider, websites_provider } =
    context_initialization(context)

  websocket_server_instance = new WebSocketManager(context, websites_provider)

  const migrations = async () => {
    // 1 September 2025
    await migrate_preset_is_default_to_is_selected(context)
    // 16 September 2025
    await migrate_api_providers_to_model_providers(context)
    // 3 October 2025
    await migrate_state_to_settings(context)
  }

  await migrations()

  // View
  if (workspace_provider && open_editors_provider && websites_provider) {
    const view_provider = new ViewProvider(
      context.extensionUri,
      workspace_provider,
      open_editors_provider,
      websites_provider,
      context,
      websocket_server_instance
    )
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'codeWebChatView',
        view_provider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      ),
      reference_in_chat_command(view_provider, workspace_provider),
      apply_chat_response_command(context, view_provider),
      apply_code_block_to_active_editor_command(context),
      undo_command(
        context,
        view_provider.set_undo_button_state,
        view_provider.set_apply_button_state
      ),
      ...code_completion_commands(
        workspace_provider,
        open_editors_provider,
        context,
        view_provider
      )
    )
  }

  const settings_provider = new SettingsProvider(context.extensionUri, context)

  context.subscriptions.push(
    open_file_from_workspace_command(open_editors_provider),
    close_editor_command(),
    close_all_editors_command(),
    save_all_command(),
    new_file_command(),
    new_folder_command(),
    rename_command(),
    delete_command(),
    save_context_command(workspace_provider, context),
    generate_commit_message_command(context),
    open_url_command({
      command: 'codeWebChat.openRepository',
      url: 'https://github.com/robertpiosik/CodeWebChat'
    }),
    feedback_command(),
    apply_context_from_clipboard_command(workspace_provider),
    vscode.commands.registerCommand('codeWebChat.settings', () => {
      settings_provider.createOrShow()
    })
  )
}

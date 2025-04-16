import * as vscode from 'vscode'
import { context_initialization } from './context/context-initialization'
import { ViewProvider } from './view/view-provider'
import { create_apply_changes_status_bar_item } from './status-bar/create-apply-changes-status-bar-item'
import { create_refactor_status_bar_item } from './status-bar/create-refactor-status-bar-item'
import { WebSocketManager } from './services/websocket-manager'
import { migrate_saved_contexts } from './migrations/migrate-saved-contexts'
import { migrate_provider_settings } from './migrations/migrate-provider-settings'
import { migrate_keybindings } from './migrations/migrate-keybindings'
import {
  apply_changes_command,
  refactor_command,
  refactor_to_clipboard_command,
  code_completion_command,
  code_completion_with_command,
  code_completion_with_suggestions_command,
  code_completion_with_suggestions_with_command,
  web_chat_command,
  web_chat_with_command,
  chat_to_clipboard_command,
  change_default_model_command,
  close_editor_command,
  close_all_editors_command,
  save_all_command,
  new_file_command,
  open_file_from_workspace_command,
  new_folder_command,
  rename_command,
  delete_command,
  code_completion_in_chat_command,
  code_completion_in_chat_with_command,
  save_context_command,
  revert_command,
  generate_commit_message_command,
  code_completion_to_clipboard_command,
  code_completion_with_suggestions_to_clipboard_command
} from './commands'

// Store WebSocketServer instance at module level
let websocket_server_instance: WebSocketManager | null = null

export async function activate(context: vscode.ExtensionContext) {
  websocket_server_instance = new WebSocketManager(context)

  const { workspace_provider, open_editors_provider, websites_provider } =
    context_initialization(context)

  const migrations = async () => {
    // Migrate saved contexts from file-based to workspace state storage
    // Delete a few weeks after 3 Apr 2025
    await migrate_saved_contexts(context)

    // Migrate provider settings from bearerToken to apiKey
    // Delete a few weeks after 8 Apr 2025
    await migrate_provider_settings()

    // Migrate keybindings from old commands to new ones
    // Delete a few weeks after 10 Apr 2025
    await migrate_keybindings()
  }

  await migrations()

  // Connect WebSocketManager with WebsitesProvider
  if (websocket_server_instance && websites_provider) {
    websocket_server_instance.set_websites_provider(websites_provider)
  }

  // Status bar
  create_refactor_status_bar_item(context)
  create_apply_changes_status_bar_item(context)

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
        'geminiCoderView',
        view_provider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      )
    )
  }

  // Register the custom open file command
  context.subscriptions.push(
    open_file_from_workspace_command(open_editors_provider)
  )

  context.subscriptions.push(
    apply_changes_command({
      command: 'geminiCoder.applyChanges',
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      context,
      use_default_model: true
    }),
    apply_changes_command({
      command: 'geminiCoder.applyChangesWith',
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      context
    }),
    apply_changes_command({
      command: 'geminiCoder.applyChangesFastReplace',
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      context,
      use_default_model: true,
      mode: 'Fast replace'
    }),
    apply_changes_command({
      command: 'geminiCoder.applyChangesIntelligentUpdate',
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      context,
      use_default_model: true,
      mode: 'Intelligent update'
    }),
    refactor_command({
      command: 'geminiCoder.refactor',
      context,
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      use_default_model: true
    }),
    refactor_command({
      command: 'geminiCoder.refactorWith',
      context,
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider
    }),
    refactor_to_clipboard_command(
      context,
      workspace_provider,
      open_editors_provider
    ),
    code_completion_with_command(
      workspace_provider,
      open_editors_provider,
      context
    ),
    code_completion_command(workspace_provider, open_editors_provider, context),
    code_completion_with_suggestions_command(
      workspace_provider,
      open_editors_provider,
      context
    ),
    code_completion_with_suggestions_with_command(
      workspace_provider,
      open_editors_provider,
      context
    ),
    code_completion_to_clipboard_command(
      workspace_provider,
      open_editors_provider
    ),
    code_completion_with_suggestions_to_clipboard_command(
      workspace_provider,
      open_editors_provider
    ),
    code_completion_in_chat_command(
      context,
      workspace_provider,
      open_editors_provider,
      websocket_server_instance
    ),
    code_completion_in_chat_with_command(
      context,
      workspace_provider,
      open_editors_provider,
      websocket_server_instance
    ),
    change_default_model_command('fim', context),
    change_default_model_command('refactoring', context),
    change_default_model_command('apply_changes', context),
    change_default_model_command('commit_message', context),
    web_chat_command(
      context,
      workspace_provider,
      open_editors_provider,
      websocket_server_instance
    ),
    web_chat_with_command(
      context,
      workspace_provider,
      open_editors_provider,
      websocket_server_instance
    ),
    chat_to_clipboard_command(
      context,
      workspace_provider,
      open_editors_provider
    ),
    close_editor_command(),
    close_all_editors_command(),
    save_all_command(),
    new_file_command(),
    new_folder_command(),
    rename_command(),
    delete_command(),
    save_context_command(workspace_provider, context),
    revert_command(context),
    generate_commit_message_command(context),
    {
      dispose: () => {
        if (websocket_server_instance) {
          websocket_server_instance.dispose()
          websocket_server_instance = null
        }
      }
    }
  )
}

export function deactivate() {
  if (websocket_server_instance) {
    websocket_server_instance.dispose()
    websocket_server_instance = null
  }
}

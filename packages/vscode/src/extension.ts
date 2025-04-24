import * as vscode from 'vscode'
import { context_initialization } from './context/context-initialization'
import { ViewProvider } from './view/view-provider'
import { create_apply_chat_response_status_bar_item } from './status-bar/create-apply-chat-response-status-bar-item'
import { create_refactor_status_bar_item } from './status-bar/create-refactor-status-bar-item'
import { WebSocketManager } from './services/websocket-manager'
import { migrate_gemini_api_key } from './migrations/migrate-gemini-api-key'
import {
  apply_chat_response_command,
  refactor_command,
  refactor_to_clipboard_command,
  code_completion_commands,
  web_chat_command,
  web_chat_with_command,
  chat_to_clipboard_command,
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
    // Migrate Gemini API key from settings to global state
    // Delete a few weeks after 21 Apr 2025
    await migrate_gemini_api_key(context)
  }

  await migrations()

  // Status bar
  create_refactor_status_bar_item(context)
  create_apply_chat_response_status_bar_item(context)

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
    apply_chat_response_command({
      command: 'geminiCoder.applyChatResponse',
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      context
    }),
    apply_chat_response_command({
      command: 'geminiCoder.applyChatResponseFastReplace',
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      context,
      mode: 'Fast replace'
    }),
    apply_chat_response_command({
      command: 'geminiCoder.applyChatResponseIntelligentUpdate',
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      context,
      mode: 'Intelligent update'
    }),
    refactor_command({
      context,
      file_tree_provider: workspace_provider,
      open_editors_provider: open_editors_provider,
      use_default_model: true
    }),
    refactor_to_clipboard_command(
      context,
      workspace_provider,
      open_editors_provider
    ),
    ...code_completion_commands(
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

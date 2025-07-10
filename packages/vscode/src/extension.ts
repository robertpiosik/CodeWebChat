import * as vscode from 'vscode'
import { context_initialization } from './context/context-initialization'
import { ViewProvider } from './view/backend/view-provider'
import { WebSocketManager } from './services/websocket-manager'
import {
  migrate_file_refactoring_to_array,
  migrate_api_tool_configs,
  migrate_api_providers_to_secret_storage,
  migrate_commit_message_prompt_to_instructions,
  migrate_chat_code_completion_instructions,
  migrate_refactoring_to_intelligent_update
} from './migrations'
import {
  apply_chat_response_command,
  code_completion_commands,
  chat_command,
  chat_using_command,
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
  commit_changes_command,
  code_completion_to_clipboard_command,
  code_completion_with_suggestions_to_clipboard_command,
  reference_in_chat_command,
  open_settings_command,
  open_url_command,
  edit_context_commands,
  apply_context_from_clipboard_command
} from './commands'

// Store WebSocketServer instance at module level
let websocket_server_instance: WebSocketManager | null = null

export async function activate(context: vscode.ExtensionContext) {
  const { workspace_provider, open_editors_provider, websites_provider } =
    context_initialization(context)

  if (!workspace_provider || !open_editors_provider || !websites_provider) {
    // No workspace opened
    return
  }

  websocket_server_instance = new WebSocketManager(context, websites_provider)

  const migrations = async () => {
    // 17 May 2025
    await migrate_api_tool_configs(context)
    // 20 May 2025
    await migrate_api_providers_to_secret_storage(context)
    // 22 May 2025
    await migrate_file_refactoring_to_array(context)
    // 25 May 2025
    await migrate_commit_message_prompt_to_instructions(context)
    await migrate_chat_code_completion_instructions(context)
    // 31 May 2025
    await migrate_refactoring_to_intelligent_update(context)
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
      reference_in_chat_command(view_provider, workspace_provider)
    )
  }

  context.subscriptions.push(
    open_file_from_workspace_command(open_editors_provider),
    apply_chat_response_command(context),
    ...edit_context_commands({
      context,
      workspace_provider,
      open_editors_provider
    }),
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
    chat_command(
      context,
      workspace_provider,
      open_editors_provider,
      websocket_server_instance
    ),
    chat_using_command(
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
    commit_changes_command(context),
    open_url_command({
      command: 'codeWebChat.openRepository',
      url: 'https://github.com/robertpiosik/CodeWebChat'
    }),
    open_settings_command(context),
    apply_context_from_clipboard_command(workspace_provider)
  )
}

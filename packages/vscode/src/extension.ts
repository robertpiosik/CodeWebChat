import * as vscode from 'vscode'
import { context_initialization } from './context/context-initialization'
import {
  get_git_repository,
  prepare_staged_changes
} from './utils/git-repository-utils'
import { generate_commit_message_from_diff } from './views/panel/backend/message-handlers/handle-commit-changes/utils'
import { PanelProvider } from './views/panel/backend/panel-provider'
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
  find_paths_in_clipboard_command,
  checkpoints_command,
  close_all_editors_command,
  save_all_command,
  new_file_command,
  open_file_from_workspace_command,
  new_folder_command,
  duplicate_workspace_command,
  rename_command,
  delete_command,
  save_context_command,
  reference_in_prompt_command,
  open_url_command
} from './commands'
import { SettingsProvider } from './views/settings/backend/settings-provider'

// Store WebSocketServer instance at module level
let websocket_server_instance: WebSocketManager | null = null

export async function activate(context: vscode.ExtensionContext) {
  const { workspace_provider, open_editors_provider, websites_provider } =
    await context_initialization(context)

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

  if (workspace_provider && open_editors_provider && websites_provider) {
    const panel_provider = new PanelProvider(
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
        panel_provider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      ),
      reference_in_prompt_command(panel_provider, workspace_provider),
      apply_chat_response_command(context, panel_provider, workspace_provider),
      ...code_completion_commands(
        workspace_provider,
        open_editors_provider,
        context,
        panel_provider
      ),
      ...checkpoints_command(workspace_provider, context, panel_provider)
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
    find_paths_in_clipboard_command(workspace_provider),
    duplicate_workspace_command(workspace_provider, websites_provider, context),
    open_url_command({
      command: 'codeWebChat.openRepository',
      url: 'https://github.com/robertpiosik/CodeWebChat'
    }),
    open_url_command({
      command: 'codeWebChat.twitter',
      url: 'https://x.com/CodeWebChat'
    }),
    vscode.commands.registerCommand(
      'codeWebChat.settings',
      (section?: string) => {
        settings_provider.createOrShow(section)
      }
    )
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codeWebChat.generateCommitMessage',
      async (source_control?: vscode.SourceControl) => {
        const repository = get_git_repository(source_control)
        if (!repository) return

        const diff = await prepare_staged_changes(repository)

        if (!diff) return

        const commit_message = await generate_commit_message_from_diff({
          context,
          repository,
          diff
        })
        if (commit_message) {
          repository.inputBox.value = commit_message
        }
      }
    )
  )
}

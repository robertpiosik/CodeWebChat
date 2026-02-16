import * as vscode from 'vscode'
import { context_initialization } from './context/context-initialization'
import { PanelProvider } from './views/panel/backend/panel-provider'
import { WebSocketManager } from './services/websocket-manager'
import { ApiManager } from './services/api-manager'
import {
  migrate_token_cache_cleanup,
  migrate_configurations_code_completions_to_code_at_cursor,
  migrate_instructions_state_cleanup
} from './migrations'
import { SharedFileState } from './context/shared-file-state'
import {
  apply_chat_response_command,
  apply_context_command,
  add_file_to_context_command,
  remove_file_from_context_command,
  code_at_cursor_commands,
  close_editor_command,
  checkpoints_command,
  close_all_editors_command,
  save_all_command,
  new_file_command,
  open_file_from_workspace_command,
  new_folder_command,
  duplicate_workspace_command,
  rename_command,
  delete_command,
  reference_in_prompt_command,
  open_url_command,
  generate_commit_message_command,
  set_ranges_command,
  check_parent_folder_command,
  uncheck_parent_folder_command,
  search_files_for_context_command,
  check_referencing_files_for_context_command,
  check_definition_file_for_context_command
} from './commands'
import {
  get_checkpoints,
  remove_old_checkpoints
} from './commands/checkpoints-command/actions'
import { CHECKPOINTS_STATE_KEY } from './constants/state-keys'
import { SettingsProvider } from './views/settings/backend/settings-provider'

// Store WebSocketServer instance at module level
let websocket_server_instance: WebSocketManager | null = null

export async function activate(context: vscode.ExtensionContext) {
  const { workspace_provider, open_editors_provider } =
    await context_initialization(context)

  websocket_server_instance = new WebSocketManager(context)

  const migrations = async () => {
    // 12 January 2026
    await migrate_token_cache_cleanup(context)
    // 30 January 2026
    await migrate_configurations_code_completions_to_code_at_cursor(context)
    // 14 February 2026
    await migrate_instructions_state_cleanup(context)
  }

  await migrations()

  const startup_tasks = async () => {
    const valid_checkpoints = await get_checkpoints(context)
    const kept_checkpoints = await remove_old_checkpoints(valid_checkpoints)
    await context.workspaceState.update(CHECKPOINTS_STATE_KEY, kept_checkpoints)
  }
  // Run startup tasks without blocking extension activation
  startup_tasks()

  const panel_provider = new PanelProvider({
    extension_uri: context.extensionUri,
    workspace_provider,
    open_editors_provider,
    context,
    websocket_server_instance
  })

  const api_manager = new ApiManager(panel_provider)

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
    reference_in_prompt_command({ panel_provider, workspace_provider }),
    apply_chat_response_command({
      context,
      panel_provider,
      workspace_provider,
      api_manager
    }),
    ...code_at_cursor_commands({
      file_tree_provider: workspace_provider,
      open_editors_provider,
      context,
      panel_provider
    }),
    ...checkpoints_command({
      context,
      workspace_provider,
      panel_provider
    })
  )

  panel_provider.set_api_manager(api_manager)

  const settings_provider = new SettingsProvider(context.extensionUri, context)

  context.subscriptions.push(
    open_file_from_workspace_command(open_editors_provider),
    close_editor_command(),
    close_all_editors_command(),
    save_all_command(),
    new_file_command(),
    new_folder_command(),
    apply_context_command({
      workspace_provider,
      on_context_selected: () => {},
      extension_context: context
    }),
    rename_command(),
    delete_command(),
    add_file_to_context_command(workspace_provider),
    remove_file_from_context_command(workspace_provider),
    set_ranges_command(workspace_provider, context),
    check_parent_folder_command(workspace_provider),
    uncheck_parent_folder_command(workspace_provider),
    duplicate_workspace_command(workspace_provider, context),
    check_referencing_files_for_context_command(workspace_provider),
    search_files_for_context_command(workspace_provider, context),
    check_definition_file_for_context_command(workspace_provider),
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
    ),
    generate_commit_message_command(context),
    vscode.commands.registerCommand(
      'codeWebChat.revealInExplorer',
      async (item: any) => {
        if (item && item.resourceUri) {
          await vscode.commands.executeCommand(
            'revealInExplorer',
            item.resourceUri
          )
        }
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.findInFolder',
      async (item: any) => {
        if (item && item.resourceUri) {
          await vscode.commands.executeCommand('workbench.action.findInFiles', {
            query: '',
            filesToInclude: item.resourceUri.fsPath,
            triggerSearch: false
          })
        }
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.undoContextSelection',
      async () => SharedFileState.get_instance().undo()
    ),
    vscode.commands.registerCommand(
      'codeWebChat.redoContextSelection',
      async () => SharedFileState.get_instance().redo()
    ),
    vscode.commands.registerCommand(
      'codeWebChat.openInIntegratedTerminal',
      async (item: any) => {
        if (item && item.resourceUri) {
          const terminal = vscode.window.createTerminal({
            cwd: item.resourceUri.fsPath
          })
          terminal.show()
        }
      }
    )
  )
}

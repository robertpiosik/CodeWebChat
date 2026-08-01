import * as vscode from 'vscode'
import { context_initialization } from './context/context-initialization'
import { PromptViewProvider } from './views/prompt/backend/prompt-view-provider'
import { WebSocketManager } from './services/websocket-manager'
import { ChatsViewProvider } from './views/chats/backend/chats-view-provider'
import { ApiManager } from './services/api-manager'
import {
  migrate_configurations_to_api_configurations,
  migrate_edit_context_to_edit_files_system_instructions,
  migrate_prompt_templates_suffixes
} from './migrations'
import {
  apply_response_command,
  copy_markdown_commands,
  copy_paths_commands,
  save_file_selection_command,
  restore_file_selection_command,
  select_workspace_file_command,
  code_at_cursor_commands,
  close_editor_command,
  history_command,
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
  search_files_commands,
  select_referencing_files_command,
  select_referencing_files_for_selected_command,
  select_definition_file_command,
  select_unstaged_files_command,
  select_commit_files_command,
  select_clipboard_paths_command,
  select_changed_files_command,
  select_parent_folder_command
} from './commands'
import { setup_git_discard_file_watcher } from './services/git-discard-file-watcher'
import { select_imported_files_command } from './commands/select-imported-files-command'
import { select_imported_files_for_selected_command } from './commands/select-imported-files-for-selected-command'
import { SettingsViewProvider } from './views/settings/backend/settings-view-provider'
import { get_current_preview_url } from './views/prompt/backend/message-handlers/handle-open-website'

let websocket_server_instance: WebSocketManager | null = null

export const activate = async (extension_context: vscode.ExtensionContext) => {
  const { workspace_provider, open_editors_provider, shared_context_state } =
    await context_initialization(extension_context)

  websocket_server_instance = new WebSocketManager(extension_context)

  const migrations = async () => {
    // 26 June 2026
    await migrate_configurations_to_api_configurations(extension_context)
    // 1 July 2026
    await migrate_edit_context_to_edit_files_system_instructions(
      extension_context
    )
    // 2 July 2026
    await migrate_prompt_templates_suffixes(extension_context)
  }

  await migrations()

  const prompt_view_provider = new PromptViewProvider({
    extension_uri: extension_context.extensionUri,
    workspace_provider,
    open_editors_provider,
    extension_context: extension_context,
    websocket_server_instance,
    shared_context_state
  })

  const chats_view_provider = new ChatsViewProvider(
    extension_context.extensionUri,
    extension_context
  )

  const api_manager = new ApiManager(prompt_view_provider, chats_view_provider)

  chats_view_provider.set_api_manager(api_manager)

  extension_context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'promptView',
      prompt_view_provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    ),
    vscode.window.registerWebviewViewProvider(
      'chatsView',
      chats_view_provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    ),
    reference_in_prompt_command({ prompt_view_provider, workspace_provider }),
    apply_response_command({
      extension_context,
      prompt_view_provider,
      workspace_provider,
      api_manager
    }),
    ...code_at_cursor_commands({
      file_tree_provider: workspace_provider,
      open_editors_provider,
      extension_context,
      prompt_view_provider
    }),
    ...history_command({
      extension_context,
      workspace_provider,
      prompt_view_provider
    })
  )

  prompt_view_provider.set_api_manager(api_manager)

  const settings_view_provider = new SettingsViewProvider(
    extension_context.extensionUri,
    extension_context
  )

  extension_context.subscriptions.push(
    ...copy_markdown_commands(workspace_provider, open_editors_provider),
    ...copy_paths_commands(workspace_provider, open_editors_provider),
    open_file_from_workspace_command(open_editors_provider),
    close_editor_command(),
    close_all_editors_command(),
    save_all_command(),
    new_file_command(),
    new_folder_command(),
    save_file_selection_command({
      workspace_provider,
      extension_context
    }),
    restore_file_selection_command({
      workspace_provider,
      extension_context,
      on_context_selected: () => {}
    }),
    select_unstaged_files_command(workspace_provider, extension_context),
    select_commit_files_command(workspace_provider, extension_context),
    select_clipboard_paths_command(workspace_provider, extension_context),
    select_changed_files_command(workspace_provider, extension_context),
    select_parent_folder_command(workspace_provider),
    rename_command(),
    delete_command(),
    select_workspace_file_command(workspace_provider),
    set_ranges_command(workspace_provider, extension_context),
    select_imported_files_command(workspace_provider, extension_context),
    duplicate_workspace_command(workspace_provider, extension_context),
    select_referencing_files_for_selected_command(
      workspace_provider,
      extension_context
    ),
    select_imported_files_for_selected_command(
      workspace_provider,
      extension_context
    ),
    select_referencing_files_command(workspace_provider, extension_context),
    ...search_files_commands(workspace_provider, extension_context),
    select_definition_file_command(workspace_provider),
    open_url_command({
      command: 'codeWebChat.visitWebsite',
      url: 'https://codeweb.chat/'
    }),
    open_url_command({
      command: 'codeWebChat.openRepository',
      url: 'https://github.com/robertpiosik/CodeWebChat'
    }),
    open_url_command({
      command: 'codeWebChat.followOnX',
      url: 'https://x.com/CodeWebChat'
    }),
    vscode.commands.registerCommand(
      'codeWebChat.settings',
      (section?: string) => {
        settings_view_provider.createOrShow(section)
      }
    ),
    generate_commit_message_command(
      extension_context,
      prompt_view_provider,
      workspace_provider
    ),
    vscode.commands.registerCommand(
      'codeWebChat.openWebsitePreviewUrl',
      async () => {
        const url = get_current_preview_url()
        if (url) {
          await vscode.env.openExternal(vscode.Uri.parse(url))
        }
      }
    ),
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
    vscode.commands.registerCommand('codeWebChat.undoSelection', async () =>
      shared_context_state.undo()
    ),
    vscode.commands.registerCommand('codeWebChat.redoSelection', async () =>
      shared_context_state.redo()
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

  const commit_status_bar_item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1000
  )
  commit_status_bar_item.text = '$(git-commit) Commit Changes'
  commit_status_bar_item.tooltip = "Use CWC's Commit Changes API tool"
  commit_status_bar_item.command = 'codeWebChat.generateCommitMessageAndCommit'
  commit_status_bar_item.show()
  extension_context.subscriptions.push(commit_status_bar_item)

  setup_git_discard_file_watcher(extension_context)
}

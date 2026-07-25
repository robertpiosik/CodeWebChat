import * as vscode from 'vscode'
import {
  WorkspaceProvider,
  FileItem
} from './providers/workspace/workspace-provider'
import { OpenEditorsProvider } from './providers/open-editors/open-editors-provider'
import { SharedContextState } from './shared-context-state'
import { EventEmitter } from 'events'
import {
  CONTEXT_CHECKED_PATHS_STATE_KEY,
  CONTEXT_CHECKED_TIMESTAMPS_STATE_KEY,
  DUPLICATE_WORKSPACE_CONTEXT_STATE_KEY,
  RANGES_STATE_KEY,
  type DuplicateWorkspaceContext
} from '../constants/state-keys'
import { SelectedFilesProvider } from './providers/selected-files/selected-files-provider'

export const token_count_emitter = new EventEmitter()

const round_token_count_for_badge = (count: number): number => {
  if (count < 1000) {
    return count
  }
  return Math.floor(count / 1000) * 1000
}

const restore_duplicated_workspace_context = async (
  extension_context: vscode.ExtensionContext
) => {
  const duplicated_context =
    extension_context.globalState.get<DuplicateWorkspaceContext>(
      DUPLICATE_WORKSPACE_CONTEXT_STATE_KEY
    )

  if (duplicated_context?.timestamp) {
    const now = Date.now()
    const age = now - duplicated_context.timestamp

    if (age <= 60000) {
      const current_workspace_folders =
        vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ??
        []

      const sorted_current_folders = [...current_workspace_folders].sort()
      const sorted_saved_folders = [
        ...(duplicated_context.workspace_root_folders ?? [])
      ].sort()

      const are_workspaces_the_same =
        sorted_current_folders.length == sorted_saved_folders.length &&
        sorted_current_folders.every(
          (value, index) => value == sorted_saved_folders[index]
        )
      if (are_workspaces_the_same) {
        await extension_context.workspaceState.update(
          CONTEXT_CHECKED_PATHS_STATE_KEY,
          duplicated_context.checked_files
        )

        await extension_context.workspaceState.update(
          CONTEXT_CHECKED_TIMESTAMPS_STATE_KEY,
          duplicated_context.checked_files_timestamps
        )

        if (duplicated_context.ranges) {
          await extension_context.workspaceState.update(
            RANGES_STATE_KEY,
            duplicated_context.ranges
          )
        }
        if (duplicated_context.open_editors) {
          for (const editor_info of duplicated_context.open_editors) {
            try {
              const uri = vscode.Uri.file(editor_info.path)
              const document = await vscode.workspace.openTextDocument(uri)
              await vscode.window.showTextDocument(document, {
                viewColumn: editor_info.view_column,
                preview: false
              })
            } catch (error) {
              console.error(
                `Failed to restore open editor for ${editor_info.path}:`,
                error
              )
            }
          }
        }
      }
    }

    await extension_context.globalState.update(
      DUPLICATE_WORKSPACE_CONTEXT_STATE_KEY,
      undefined
    )
  }
}

export const context_initialization = async (
  extension_context: vscode.ExtensionContext
): Promise<{
  workspace_provider: WorkspaceProvider
  open_editors_provider: OpenEditorsProvider
  shared_context_state: SharedContextState
}> => {
  await restore_duplicated_workspace_context(extension_context)

  const workspace_folders = vscode.workspace.workspaceFolders ?? []

  let workspace_view: vscode.TreeView<FileItem>

  const shared_context_state = new SharedContextState()

  const workspace_provider = new WorkspaceProvider({
    workspace_folders,
    extension_context
  })
  const selected_files_provider = new SelectedFilesProvider(workspace_provider)
  extension_context.subscriptions.push(selected_files_provider)

  const open_editors_provider = new OpenEditorsProvider({
    workspace_folders,
    workspace_provider,
    shared_context_state
  })

  const update_view_badges = async () => {
    let context_token_count = 0
    if (selected_files_provider && selected_files_view) {
      if (!workspace_provider.is_no_context_mode) {
        const token_counts =
          await workspace_provider.get_checked_files_token_count()
        const files_count = workspace_provider.use_shrink_token_count
          ? token_counts.shrink
          : token_counts.total
        context_token_count = files_count
      }

      workspace_view.badge = {
        value: round_token_count_for_badge(context_token_count),
        tooltip: context_token_count
          ? `About ${context_token_count} tokens in context`
          : ''
      }
      selected_files_view.badge = undefined
    }
    token_count_emitter.emit('token-count-updated', context_token_count)
  }

  shared_context_state.set_providers(workspace_provider, open_editors_provider)

  extension_context.subscriptions.push({
    dispose: () => shared_context_state.dispose()
  })

  const register_workspace_view_handlers = (
    view: vscode.TreeView<FileItem>
  ) => {
    view.onDidChangeCheckboxState(async (e) => {
      for (const [item, state] of e.items) {
        await workspace_provider!.update_check_state(item, state)
      }
    })

    // Fix for issue when the collapsed item has some of its children selected
    view.onDidCollapseElement(() => {
      workspace_provider!.refresh()
    })
  }

  workspace_view = vscode.window.createTreeView('codeWebChatViewWorkspace', {
    treeDataProvider: workspace_provider,
    manageCheckboxStateManually: true
  })

  let selected_files_view = vscode.window.createTreeView(
    'codeWebChatViewSelectedFiles',
    {
      treeDataProvider: selected_files_provider,
      manageCheckboxStateManually: true
    }
  )

  register_workspace_view_handlers(workspace_view)
  register_workspace_view_handlers(selected_files_view)

  const open_editors_view = vscode.window.createTreeView(
    'codeWebChatViewOpenEditors',
    {
      treeDataProvider: open_editors_provider,
      manageCheckboxStateManually: true
    }
  )

  extension_context.subscriptions.push(
    workspace_provider,
    open_editors_provider,
    workspace_view,
    selected_files_view,
    open_editors_view
  )

  extension_context.subscriptions.push(
    vscode.commands.registerCommand(
      'codeWebChat.expandContextFolders',
      async () => {
        workspace_provider.set_selected_files_view_collapsible_state(
          vscode.TreeItemCollapsibleState.Expanded
        )
        selected_files_view.dispose()
        await new Promise((resolve) => setTimeout(resolve, 0))

        selected_files_view = vscode.window.createTreeView(
          'codeWebChatViewSelectedFiles',
          {
            treeDataProvider: selected_files_provider,
            manageCheckboxStateManually: true
          }
        )

        register_workspace_view_handlers(selected_files_view)
        extension_context.subscriptions.push(selected_files_view)
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.collapseContextFolders',
      async () => {
        workspace_provider.set_selected_files_view_collapsible_state(
          vscode.TreeItemCollapsibleState.Collapsed
        )
        selected_files_view.dispose()
        await new Promise((resolve) => setTimeout(resolve, 0))

        selected_files_view = vscode.window.createTreeView(
          'codeWebChatViewSelectedFiles',
          {
            treeDataProvider: selected_files_provider,
            manageCheckboxStateManually: true
          }
        )

        register_workspace_view_handlers(selected_files_view)
        extension_context.subscriptions.push(selected_files_view)
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.collapseWorkspaceFolders',
      async () => {
        workspace_provider.set_workspace_view_collapsible_state(
          vscode.TreeItemCollapsibleState.Collapsed
        )
        workspace_view.dispose()
        await new Promise((resolve) => setTimeout(resolve, 0))

        workspace_view = vscode.window.createTreeView(
          'codeWebChatViewWorkspace',
          {
            treeDataProvider: workspace_provider!,
            manageCheckboxStateManually: true
          }
        )

        register_workspace_view_handlers(workspace_view)
        extension_context.subscriptions.push(workspace_view)
      }
    ),
    vscode.commands.registerCommand('codeWebChat.clearChecks', async () => {
      await workspace_provider!.clear_checks()
    }),
    vscode.commands.registerCommand('codeWebChat.checkAll', async () => {
      await workspace_provider!.check_all()
    }),
    vscode.commands.registerCommand(
      'codeWebChat.clearChecksOpenEditors',
      () => {
        open_editors_provider!.clear_checks()
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.checkAllOpenEditors',
      async () => {
        await open_editors_provider!.check_all()
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.removeFolderFromWorkspace',
      async (item: FileItem) => {
        if (!item?.resourceUri) return

        const folder = vscode.workspace.getWorkspaceFolder(item.resourceUri)
        if (folder) {
          vscode.workspace.updateWorkspaceFolders(folder.index, 1)
        }
      }
    )
  )

  open_editors_view.onDidChangeCheckboxState(async (e) => {
    for (const [item, state] of e.items) {
      await open_editors_provider!.update_check_state(item, state)
    }
  })

  extension_context.subscriptions.push(
    workspace_provider.onDidChangeCheckedFiles(() => {
      update_view_badges()
    }),
    open_editors_provider.onDidChangeCheckedFiles(() => {
      update_view_badges()
    }),
    workspace_provider.onDidChangeTreeData(() => {
      update_view_badges()
    })
  )

  // Update badge when tabs change with debouncing to avoid multiple updates
  let tab_change_timeout: NodeJS.Timeout | null = null
  extension_context.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs(() => {
      if (tab_change_timeout) {
        clearTimeout(tab_change_timeout)
      }
      tab_change_timeout = setTimeout(() => {
        update_view_badges()
        tab_change_timeout = null
      }, 100)
    })
  )

  extension_context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      if (vscode.workspace.workspaceFolders) {
        await workspace_provider.update_workspace_folders(
          vscode.workspace.workspaceFolders
        )
        open_editors_provider.update_workspace_folders(
          vscode.workspace.workspaceFolders
        )
        shared_context_state.set_providers(
          workspace_provider,
          open_editors_provider
        )
        update_view_badges()
      }
    })
  )

  workspace_view.onDidCollapseElement(() => {
    workspace_provider!.refresh()
  })

  extension_context.subscriptions.push(
    open_editors_provider.onDidChangeTreeData(() => {
      if (open_editors_provider!.is_initialized()) {
        update_view_badges()
      }
    })
  )

  // Also schedule a delayed update for initial badge display
  setTimeout(() => {
    update_view_badges()
  }, 1000) // Wait for 1 second to ensure VS Code has fully loaded

  return {
    workspace_provider,
    open_editors_provider,
    shared_context_state
  }
}

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { SAVED_CONTEXTS_STATE_KEY } from '../constants/state-keys'

type SavedContext = {
  name: string
  paths: string[]
}

async function apply_saved_context(
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider
): Promise<void> {
  const workspace_name = path.basename(workspace_root)

  // Check if we're in a multi-workspace environment
  const workspaceFolders = vscode.workspace.workspaceFolders || []
  const workspaceMap = new Map<string, string>()

  for (const folder of workspaceFolders) {
    workspaceMap.set(folder.name, folder.uri.fsPath)
  }

  // Convert workspace-prefixed paths to absolute paths
  const absolute_paths = context.paths.map((prefixed_path) => {
    // Check if path has workspace prefix
    if (prefixed_path.includes(':')) {
      const [prefix, relative_path] = prefixed_path.split(':', 2)

      // If this workspace name matches the current prefix, use current workspace root
      if (prefix === workspace_name) {
        return path.join(workspace_root, relative_path)
      }

      // Check if this is from a different workspace folder
      const alternate_root = workspaceMap.get(prefix)
      if (alternate_root) {
        return path.join(alternate_root, relative_path)
      }

      // Fallback - treat as a path in the current workspace
      return path.join(workspace_root, relative_path)
    }

    // Legacy support for paths without workspace prefix
    return path.isAbsolute(prefixed_path)
      ? prefixed_path
      : path.join(workspace_root, prefixed_path)
  })

  // Filter to only existing paths
  const existing_paths = absolute_paths.filter((p) => fs.existsSync(p))

  if (existing_paths.length == 0) {
    vscode.window.showWarningMessage(
      `No valid paths found in context "${context.name}".`
    )
    return
  }

  await workspace_provider.set_checked_files(existing_paths)
  vscode.window.showInformationMessage(`Applied context "${context.name}".`)
}

export function select_saved_context_command(
  workspace_provider: WorkspaceProvider | undefined,
  on_context_selected: () => void,
  extContext: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'geminiCoder.selectSavedContext',
    async () => {
      if (!workspace_provider) {
        vscode.window.showErrorMessage('No workspace provider available')
        return
      }

      const workspace_root = workspace_provider.getWorkspaceRoot()

      // Get saved contexts from workspace state
      const saved_contexts: SavedContext[] = extContext.workspaceState.get(
        SAVED_CONTEXTS_STATE_KEY,
        []
      )

      if (saved_contexts.length == 0) {
        vscode.window.showInformationMessage('No saved contexts found.')
        return
      }

      try {
        // Define delete button
        const delete_button = {
          iconPath: new vscode.ThemeIcon('trash'),
          tooltip: 'Delete this saved context'
        }

        // Function to create quickpick items from contexts
        const createQuickPickItems = (contexts: SavedContext[]) => {
          return contexts.map((context) => ({
            label: context.name,
            description: `${context.paths.length} ${
              context.paths.length > 1 ? 'paths' : 'path'
            }`,
            context: context,
            buttons: [delete_button]
          }))
        }

        // Create QuickPick with buttons
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = createQuickPickItems(saved_contexts)
        quick_pick.placeholder = 'Select saved context'

        // Create a promise to be resolved when an item is picked or the quick pick is hidden
        const quick_pick_promise = new Promise<
          (vscode.QuickPickItem & { context: SavedContext }) | undefined
        >((resolve) => {
          quick_pick.onDidAccept(() => {
            const selectedItem = quick_pick
              .activeItems[0] as vscode.QuickPickItem & {
              context: SavedContext
            }
            quick_pick.hide()
            resolve(selectedItem)
          })

          quick_pick.onDidHide(() => {
            resolve(undefined)
          })

          quick_pick.onDidTriggerItemButton(async (event) => {
            const item = event.item as vscode.QuickPickItem & {
              context: SavedContext
            }
            const confirm_delete = await vscode.window.showWarningMessage(
              `Are you sure you want to delete context "${item.context.name}"?`,
              { modal: true },
              'Delete'
            )

            if (confirm_delete == 'Delete') {
              // Remove the context from the state
              const updatedContexts = saved_contexts.filter(
                (c) => c.name != item.context.name
              )

              // Update workspace state
              await extContext.workspaceState.update(
                SAVED_CONTEXTS_STATE_KEY,
                updatedContexts
              )
              vscode.window.showInformationMessage(
                `Deleted context "${item.context.name}"`
              )

              // Update the quick pick items
              if (updatedContexts.length == 0) {
                quick_pick.hide()
                vscode.window.showInformationMessage(
                  'No saved contexts remaining.'
                )
              } else {
                // Update items and ensure the quick pick stays visible
                quick_pick.items = createQuickPickItems(updatedContexts)
                quick_pick.show() // Ensure quick pick is visible
              }
            }
          })
        })

        quick_pick.show()
        const selected = await quick_pick_promise
        if (!selected) return

        await apply_saved_context(
          selected.context,
          workspace_root,
          workspace_provider
        )
        on_context_selected()
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error accessing saved contexts: ${error.message}`
        )
      }
    }
  )
}

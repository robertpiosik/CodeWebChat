import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace/workspace-provider'

export const uncheck_parent_folder_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.uncheckParentFolder',
    async (item: FileItem) => {
      if (!item) return

      const file_path = item.resourceUri.fsPath
      const workspace_root =
        workspace_provider.get_workspace_root_for_file(file_path)

      if (!workspace_root) return

      const folders: { label: string; full_path: string }[] = []
      let current_dir = path.dirname(file_path)

      while (
        current_dir.startsWith(workspace_root) &&
        current_dir !== workspace_root
      ) {
        const label = path
          .relative(workspace_root, current_dir)
          .replace(/\\/g, '/')

        folders.push({
          label: label,
          full_path: current_dir
        })

        current_dir = path.dirname(current_dir)
      }

      if (folders.length == 0) {
        vscode.window.showInformationMessage('No parent folders found.')
        return
      }

      const selected = await new Promise<
        { label: string; full_path: string } | undefined
      >((resolve) => {
        const quick_pick = vscode.window.createQuickPick<{
          label: string
          full_path: string
        }>()
        quick_pick.items = folders
        quick_pick.placeholder = 'Select a parent folder to uncheck'
        quick_pick.title = 'Parent Folders'
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: 'Close'
          }
        ]

        quick_pick.onDidTriggerButton(() => {
          resolve(undefined)
          quick_pick.hide()
        })

        quick_pick.onDidAccept(() => {
          resolve(quick_pick.selectedItems[0])
          quick_pick.hide()
        })

        quick_pick.onDidHide(() => {
          resolve(undefined)
          quick_pick.dispose()
        })

        quick_pick.show()
      })

      if (selected) {
        const is_workspace_root = selected.full_path === workspace_root
        const folder_item = new FileItem(
          path.basename(selected.full_path),
          vscode.Uri.file(selected.full_path),
          vscode.TreeItemCollapsibleState.Collapsed,
          true,
          vscode.TreeItemCheckboxState.Unchecked,
          false,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          is_workspace_root
        )

        await workspace_provider.update_check_state(
          folder_item,
          vscode.TreeItemCheckboxState.Unchecked
        )
      }
    }
  )
}

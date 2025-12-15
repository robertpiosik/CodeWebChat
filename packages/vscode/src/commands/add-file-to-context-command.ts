import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace-provider'
import { natural_sort } from '../utils/natural-sort'

interface FileQuickPickItem extends vscode.QuickPickItem {
  full_path: string
}

export const add_file_to_context_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.addFileToContext',
    async () => {
      const workspace_roots = workspace_provider.getWorkspaceRoots()
      if (workspace_roots.length === 0) {
        return
      }

      const quick_pick = vscode.window.createQuickPick<FileQuickPickItem>()
      quick_pick.placeholder = 'Select a file to add to context'
      quick_pick.matchOnDescription = true
      quick_pick.busy = true
      quick_pick.show()

      quick_pick.onDidTriggerItemButton(async (e) => {
        const item = e.item
        if (e.button.tooltip == 'Add Parent Folder to Context') {
          const workspace_root = workspace_provider.get_workspace_root_for_file(
            item.full_path
          )

          if (!workspace_root) return

          const folders: { label: string; full_path: string }[] = []
          let current_dir = path.dirname(item.full_path)

          while (
            current_dir.startsWith(workspace_root) &&
            current_dir != workspace_root
          ) {
            const relative = path.relative(workspace_root, current_dir)
            folders.push({
              label: relative.replace(/\\/g, '/'),
              full_path: current_dir
            })
            current_dir = path.dirname(current_dir)
          }

          if (folders.length == 0) {
            vscode.window.showInformationMessage('No parent folders to add.')
            return
          }

          const folder_quick_pick = vscode.window.createQuickPick<{
            label: string
            full_path: string
          }>()
          folder_quick_pick.placeholder = 'Select a folder to add to context'
          folder_quick_pick.items = folders.map((f) => ({
            label: f.label,
            full_path: f.full_path
          }))

          folder_quick_pick.onDidAccept(async () => {
            const selected = folder_quick_pick.selectedItems[0]
            if (selected) {
              const file_item = new FileItem(
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
                false,
                undefined
              )

              await workspace_provider.update_check_state(
                file_item,
                vscode.TreeItemCheckboxState.Checked
              )
              folder_quick_pick.hide()
              quick_pick.hide()
            }
          })

          folder_quick_pick.onDidHide(() => {
            folder_quick_pick.dispose()
          })

          folder_quick_pick.show()
        }
      })

      try {
        const all_files: string[] = []
        for (const root of workspace_roots) {
          const files = await workspace_provider.find_all_files(root)
          all_files.push(...files)
        }

        const items: FileQuickPickItem[] = all_files.map((file_path) => {
          const workspace_root =
            workspace_provider.get_workspace_root_for_file(file_path)

          const relative_path = workspace_root
            ? path.relative(workspace_root, file_path)
            : file_path

          const filename = path.basename(relative_path)
          let directory = path.dirname(relative_path)
          if (directory === '.') {
            directory = ''
          }

          if (workspace_roots.length > 1 && workspace_root) {
            const workspace_name =
              workspace_provider.get_workspace_name(workspace_root)
            directory = directory
              ? `${workspace_name} • ${directory}`
              : workspace_name
          }

          return {
            label: filename,
            description: directory,
            full_path: file_path,
            buttons: [
              {
                iconPath: new vscode.ThemeIcon('folder'),
                tooltip: 'Add Parent Folder to Context'
              }
            ]
          }
        })

        items.sort((a, b) => {
          const label_diff = natural_sort(a.label, b.label)
          if (label_diff !== 0) return label_diff
          return natural_sort(a.description || '', b.description || '')
        })

        quick_pick.items = items
        quick_pick.busy = false

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          if (selected) {
            const current_checked = workspace_provider.get_checked_files()
            if (!current_checked.includes(selected.full_path)) {
              await workspace_provider.set_checked_files([
                ...current_checked,
                selected.full_path
              ])
            }
            quick_pick.hide()
          }
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
        })
      } catch (error) {
        console.error(error)
        quick_pick.hide()
      }
    }
  )
}

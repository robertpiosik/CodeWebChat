import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace/workspace-provider'
import { natural_sort } from '../utils/natural-sort'

interface FileQuickPickItem extends vscode.QuickPickItem {
  full_path: string
}

export const remove_file_from_context_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.removeFileFromContext',
    async () => {
      const current_checked = workspace_provider.get_checked_files()

      if (current_checked.length == 0) {
        vscode.window.showInformationMessage('No files currently in context.')
        return
      }

      const workspace_roots = workspace_provider.getWorkspaceRoots()
      let files_to_show = current_checked
      let show_workspace_prefix = workspace_roots.length > 1

      if (workspace_roots.length > 1) {
        const roots_with_checked_files = new Map<string, string[]>()

        for (const file_path of current_checked) {
          const root = workspace_provider.get_workspace_root_for_file(file_path)
          if (root) {
            if (!roots_with_checked_files.has(root)) {
              roots_with_checked_files.set(root, [])
            }
            roots_with_checked_files.get(root)!.push(file_path)
          }
        }

        const eligible_roots = Array.from(roots_with_checked_files.keys())

        if (eligible_roots.length > 1) {
          const items: vscode.QuickPickItem[] = eligible_roots
            .map((root) => ({
              label: workspace_provider.get_workspace_name(root),
              description: root
            }))
            .sort((a, b) => natural_sort(a.label, b.label))

          const selected = await new Promise<vscode.QuickPickItem | undefined>(
            (resolve) => {
              const quick_pick = vscode.window.createQuickPick()
              quick_pick.items = items
              quick_pick.placeholder =
                'Select a workspace folder to remove files from'
              quick_pick.title = 'Workspace Folders'
              quick_pick.buttons = [
                {
                  iconPath: new vscode.ThemeIcon('close'),
                  tooltip: 'Close'
                }
              ]

              quick_pick.onDidTriggerButton((button) => {
                if (button.tooltip == 'Close') {
                  quick_pick.hide()
                }
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
            }
          )

          if (!selected || !selected.description) {
            return
          }

          files_to_show = roots_with_checked_files.get(selected.description)!
          show_workspace_prefix = false
        }
      }

      const quick_pick = vscode.window.createQuickPick<FileQuickPickItem>()
      quick_pick.title = 'Context Files'
      quick_pick.placeholder = 'Select a file to remove from context'
      quick_pick.matchOnDescription = true
      quick_pick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Close'
        }
      ]
      quick_pick.show()

      quick_pick.onDidTriggerButton((button) => {
        if (button.tooltip == 'Close') {
          quick_pick.hide()
        }
      })

      let is_showing_folder_quick_pick = false
      let file_items_cache: FileQuickPickItem[] = []

      let parent_folder_source_full_path: string | undefined

      quick_pick.onDidTriggerItemButton(async (e) => {
        const item = e.item
        if (e.button.tooltip == 'Remove Parent Folder from Context') {
          parent_folder_source_full_path = item.full_path

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
            vscode.window.showInformationMessage('No parent folders to remove.')
            return
          }

          const folder_quick_pick = vscode.window.createQuickPick<{
            label: string
            full_path: string
          }>()
          folder_quick_pick.title = 'Parent Folders'
          folder_quick_pick.placeholder =
            'Select a folder to remove from context'
          folder_quick_pick.items = folders.map((f) => ({
            label: f.label,
            full_path: f.full_path
          }))
          folder_quick_pick.buttons = [vscode.QuickInputButtons.Back]

          let folder_accepted = false

          folder_quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              folder_quick_pick.hide()
            }
          })

          folder_quick_pick.onDidAccept(async () => {
            const selected = folder_quick_pick.selectedItems[0]
            if (selected) {
              folder_accepted = true
              const file_item = new FileItem(
                path.basename(selected.full_path),
                vscode.Uri.file(selected.full_path),
                vscode.TreeItemCollapsibleState.Collapsed,
                true,
                vscode.TreeItemCheckboxState.Checked,
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
                vscode.TreeItemCheckboxState.Unchecked
              )
              folder_quick_pick.hide()
              quick_pick.hide()
            }
          })

          folder_quick_pick.onDidHide(() => {
            folder_quick_pick.dispose()
            is_showing_folder_quick_pick = false

            if (!folder_accepted) {
              if (file_items_cache.length > 0) {
                quick_pick.items = file_items_cache
              }
              quick_pick.show()

              const source_item = parent_folder_source_full_path
                ? file_items_cache.find(
                    (i) => i.full_path === parent_folder_source_full_path
                  )
                : undefined

              if (source_item) {
                setTimeout(() => {
                  quick_pick.activeItems = [source_item]
                }, 0)
              }
            }
          })

          is_showing_folder_quick_pick = true
          quick_pick.hide()
          folder_quick_pick.show()
        }
      })

      const items: FileQuickPickItem[] = files_to_show.map((file_path) => {
        const workspace_root =
          workspace_provider.get_workspace_root_for_file(file_path)

        const relative_path = workspace_root
          ? path.relative(workspace_root, file_path)
          : file_path

        const filename = path.basename(relative_path)
        let directory = path.dirname(relative_path)
        const has_parent_folder = directory != '.'

        if (directory == '.') {
          directory = ''
        }

        if (show_workspace_prefix && workspace_root) {
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
          buttons: has_parent_folder
            ? [
                {
                  iconPath: new vscode.ThemeIcon('folder'),
                  tooltip: 'Remove Parent Folder from Context'
                }
              ]
            : []
        }
      })

      items.sort((a, b) => {
        const label_diff = natural_sort(a.label, b.label)
        if (label_diff != 0) return label_diff
        return natural_sort(a.description || '', b.description || '')
      })

      file_items_cache = items
      quick_pick.items = items

      quick_pick.onDidAccept(async () => {
        const selected = quick_pick.selectedItems[0]
        if (selected) {
          const new_checked = current_checked.filter(
            (p) => p != selected.full_path
          )
          await workspace_provider.set_checked_files(new_checked)
          quick_pick.hide()
        }
      })

      quick_pick.onDidHide(() => {
        if (is_showing_folder_quick_pick) {
          return
        }
        quick_pick.dispose()
      })
    }
  )
}

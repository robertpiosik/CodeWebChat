import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { natural_sort } from '../utils/natural-sort'
import { t } from '../i18n'
import { show_parent_folder_quick_pick } from '../utils/show-parent-folder-quick-pick'

interface FileQuickPickItem extends vscode.QuickPickItem {
  full_path: string
}

let last_search_query = ''
let last_interacted_path: string | undefined = undefined

export const select_workspace_file_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectWorkspaceFile',
    async () => {
      const workspace_roots = workspace_provider.get_workspace_roots()
      if (workspace_roots.length == 0) {
        return
      }

      let roots_to_index = workspace_roots

      if (workspace_roots.length > 1) {
        const items: vscode.QuickPickItem[] = workspace_roots.map((root) => ({
          label: workspace_provider.get_workspace_name(root),
          description: root
        }))

        const selected = await new Promise<vscode.QuickPickItem | undefined>(
          (resolve) => {
            const quick_pick = vscode.window.createQuickPick()
            quick_pick.items = items
            quick_pick.activeItems = []
            quick_pick.placeholder = t(
              'command.select-workspace-file.select-workspace'
            )
            quick_pick.title = t(
              'command.select-workspace-file.workspace-folders'
            )
            quick_pick.ignoreFocusOut = true
            quick_pick.buttons = [
              {
                iconPath: new vscode.ThemeIcon('close'),
                tooltip: t('common.close')
              }
            ]

            quick_pick.onDidTriggerButton((button) => {
              if (button.tooltip == t('common.close')) {
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

        roots_to_index = [selected.description]
      }

      const quick_pick = vscode.window.createQuickPick<FileQuickPickItem>()
      quick_pick.title = t('command.select-workspace-file.workspace-files')
      quick_pick.placeholder = t('command.select-workspace-file.select-file')
      quick_pick.matchOnDescription = true
      quick_pick.value = last_search_query
      quick_pick.ignoreFocusOut = true
      quick_pick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
        }
      ]
      quick_pick.busy = true
      quick_pick.show()

      quick_pick.onDidChangeValue((value) => {
        last_search_query = value
      })

      quick_pick.onDidTriggerButton((button) => {
        if (button.tooltip == t('common.close')) {
          quick_pick.hide()
        }
      })

      let is_showing_folder_quick_pick = false
      let file_items_cache: FileQuickPickItem[] = []

      quick_pick.onDidTriggerItemButton(async (e) => {
        const item = e.item
        last_interacted_path = item.full_path

        if (e.button.tooltip == t('common.select-parent-folder')) {
          is_showing_folder_quick_pick = true
          quick_pick.hide()

          const result = await show_parent_folder_quick_pick({
            file_path: item.full_path,
            workspace_provider
          })

          is_showing_folder_quick_pick = false

          if (
            result === 'added' ||
            result === 'back' ||
            result === 'no_folders' ||
            result === 'no_workspace_root'
          ) {
            if (file_items_cache.length > 0) {
              quick_pick.items = file_items_cache
              quick_pick.activeItems = []
            }
            quick_pick.value = last_search_query
            quick_pick.show()

            const source_item = last_interacted_path
              ? file_items_cache.find(
                  (i) => i.full_path === last_interacted_path
                )
              : undefined

            if (source_item) {
              setTimeout(() => {
                quick_pick.activeItems = [source_item]
              }, 0)
            }
          } else if (result === 'cancel') {
            quick_pick.dispose()
          }
        } else if (e.button.iconPath instanceof vscode.ThemeIcon) {
          if (e.button.iconPath.id == 'go-to-file') {
            quick_pick.activeItems = [item]
            await vscode.commands.executeCommand(
              'vscode.open',
              vscode.Uri.file(item.full_path)
            )
          }
        }
      })

      try {
        const all_files: string[] = []
        for (const root of roots_to_index) {
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
          const has_parent_folder = directory != '.'

          if (directory == '.') {
            directory = ''
          }

          if (roots_to_index.length > 1 && workspace_root) {
            const workspace_name =
              workspace_provider.get_workspace_name(workspace_root)
            directory = directory
              ? `${workspace_name} • ${directory}`
              : workspace_name
          }

          const buttons: vscode.QuickInputButton[] = []

          if (has_parent_folder) {
            buttons.push({
              iconPath: new vscode.ThemeIcon('folder'),
              tooltip: t('common.select-parent-folder')
            })
          }

          buttons.push({
            iconPath: new vscode.ThemeIcon('go-to-file'),
            tooltip: t('command.select-workspace-file.go-to-file')
          })

          return {
            label: filename,
            description: directory,
            full_path: file_path,
            buttons
          }
        })

        items.sort((a, b) => {
          const label_diff = natural_sort(a.label, b.label)
          if (label_diff != 0) return label_diff
          return natural_sort(a.description || '', b.description || '')
        })

        file_items_cache = items
        quick_pick.items = items
        quick_pick.activeItems = []
        quick_pick.busy = false

        if (last_interacted_path) {
          const last_item = items.find(
            (i) => i.full_path === last_interacted_path
          )
          if (last_item) {
            setTimeout(() => {
              quick_pick.activeItems = [last_item]
            }, 0)
          }
        }

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          if (selected) {
            last_interacted_path = selected.full_path
            const current_checked = workspace_provider.get_checked_files()
            if (!current_checked.includes(selected.full_path)) {
              await workspace_provider.set_checked_files([
                ...current_checked,
                selected.full_path
              ])
            }

            quick_pick.activeItems = [selected]
          }
        })

        quick_pick.onDidHide(() => {
          if (is_showing_folder_quick_pick) {
            return
          }
          quick_pick.dispose()
        })
      } catch (error) {
        console.error(error)
        quick_pick.hide()
      }
    }
  )
}

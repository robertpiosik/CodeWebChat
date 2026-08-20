import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { display_token_count } from '@/utils/display-token-count'
import { t } from '@/i18n'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'
import { search_files } from '@/features/search-files'
import { WebSocketManager } from '@/services/websocket-manager'

export const prompt_for_referencing_files = async (params: {
  matched_files: { file_path: string; range: vscode.Range }[]
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
}): Promise<string[] | undefined> => {
  const matched_files = params.matched_files
  let selected_paths: string[] = []

  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
  }

  const add_parent_folder_button = {
    iconPath: new vscode.ThemeIcon('folder'),
    tooltip: t('common.select-parent-folder')
  }

  const currently_checked = params.workspace_provider.get_checked_files()

  const quick_pick_items: (vscode.QuickPickItem & {
    file_path: string
    range: vscode.Range
  })[] = await Promise.all(
    matched_files.map(async ({ file_path, range }) => {
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)
      const relative_path = workspace_root
        ? path.relative(workspace_root, file_path)
        : file_path

      const dir_name = path.dirname(relative_path)
      const has_parent_folder = dir_name != '.'
      const display_dir = dir_name == '.' ? '' : dir_name

      const token_count =
        await params.workspace_provider.calculate_file_tokens(file_path)
      const formatted_token_count = display_token_count(token_count.total)

      const buttons: vscode.QuickInputButton[] = []
      if (has_parent_folder) {
        buttons.push(add_parent_folder_button)
      }
      buttons.push(open_file_button)

      return {
        label: path.basename(file_path),
        description: display_dir
          ? `${formatted_token_count} · ${display_dir}`
          : formatted_token_count,
        file_path,
        token_count: token_count.total,
        range,
        buttons
      }
    })
  )

  let current_selected_items = quick_pick_items.filter((item) =>
    currently_checked.includes(item.file_path)
  )

  while (true) {
    const quick_pick = vscode.window.createQuickPick<
      vscode.QuickPickItem & { file_path: string; range: vscode.Range }
    >()
    quick_pick.items = quick_pick_items
    quick_pick.selectedItems = current_selected_items
    quick_pick.canSelectMany = true
    quick_pick.title = t('command.select-referencing-files.referencing-files')

    const base_placeholder = t('command.select-referencing-files.select-files')
    const update_title = () => {
      const total = quick_pick.selectedItems.reduce(
        (sum, item) => sum + ((item as any).token_count || 0),
        0
      )
      const total_text =
        total > 0
          ? ` (${t('common.totalling-tokens', {
              tokens: display_token_count(total)
            })})`
          : ''
      quick_pick.placeholder = `${base_placeholder}${total_text}`
    }
    update_title()
    quick_pick.onDidChangeSelection(update_title)

    quick_pick.ignoreFocusOut = true

    const close_button = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }
    const search_button = {
      iconPath: new vscode.ThemeIcon('search'),
      tooltip: t('command.select-referencing-files.search')
    }
    quick_pick.buttons = [search_button, close_button]

    let is_showing_folder_quick_pick = false

    const selected_items = await new Promise<
      | readonly (vscode.QuickPickItem & {
          file_path: string
          range: vscode.Range
        })[]
      | undefined
      | 'search'
    >((resolve) => {
      let is_accepted = false

      quick_pick.onDidTriggerButton((button) => {
        if (button === close_button) {
          resolve(undefined)
          quick_pick.hide()
        } else if (button === search_button) {
          current_selected_items = [...quick_pick.selectedItems]
          resolve('search')
          quick_pick.hide()
        }
      })

      quick_pick.onDidAccept(() => {
        is_accepted = true
        resolve(quick_pick.selectedItems)
        quick_pick.hide()
      })

      quick_pick.onDidHide(() => {
        if (is_showing_folder_quick_pick) return
        if (!is_accepted) {
          resolve(undefined)
        }
        quick_pick.dispose()
      })

      quick_pick.onDidTriggerItemButton(async (e) => {
        if (e.button === open_file_button) {
          try {
            const doc = await vscode.workspace.openTextDocument(
              e.item.file_path
            )
            await vscode.window.showTextDocument(doc, {
              preview: true,
              selection: e.item.range
            })
          } catch (error) {
            vscode.window.showErrorMessage(
              t('command.select-referencing-files.error-opening', {
                error: String(error)
              })
            )
          }
        } else if (e.button === add_parent_folder_button) {
          is_showing_folder_quick_pick = true
          quick_pick.hide()

          const result = await show_parent_folder_quick_pick({
            file_path: e.item.file_path,
            workspace_provider: params.workspace_provider
          })

          is_showing_folder_quick_pick = false

          if (
            result === 'added' ||
            result === 'back' ||
            result === 'no_folders' ||
            result === 'no_workspace_root'
          ) {
            const current_items = quick_pick.items
            let current_selected = quick_pick.selectedItems

            if (result === 'added') {
              const updated_checked =
                params.workspace_provider.get_checked_files()
              current_selected = current_items.filter(
                (item) =>
                  updated_checked.includes(item.file_path) ||
                  current_selected.includes(item)
              )
            }

            quick_pick.items = [...current_items]
            quick_pick.selectedItems = current_selected
            quick_pick.show()

            setTimeout(() => {
              quick_pick.activeItems = [e.item]
            }, 0)
          } else {
            is_accepted = true
            resolve(undefined)
            quick_pick.dispose()
          }
        }
      })

      quick_pick.show()
    })

    if (!selected_items) {
      return undefined
    }

    if (selected_items === 'search') {
      const search_result = await search_files({
        get_files: async () => current_selected_items.map((i) => i.file_path),
        workspace_provider: params.workspace_provider,
        extension_context: params.extension_context,
        websocket_manager: params.websocket_manager,
        show_back_button: true
      })

      if (search_result === 'back') {
        continue
      }

      if (!search_result) {
        return undefined
      }

      selected_paths = search_result.selected_paths
      break
    } else {
      selected_paths = selected_items.map((item) => item.file_path)
      break
    }
  }

  return selected_paths
}

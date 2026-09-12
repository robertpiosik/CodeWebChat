import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'
import { group_quick_pick_items } from '@/utils/group-quick-pick-items'
import { map_files_to_quick_pick_items } from '@/utils/map-files-to-quick-pick-items'
import { handle_parent_folder_result } from '@/utils/handle-parent-folder-result'
import { display_token_count } from '@shared/utils/display-token-count'

export const show_search_results_quick_pick = async (params: {
  matched_items: { path: string; checked?: boolean }[]
  workspace_provider: WorkspaceProvider
  title: string
  show_back_button: boolean
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | 'back'
  | undefined
> => {
  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
  }
  const add_parent_folder_button = {
    iconPath: new vscode.ThemeIcon('folder'),
    tooltip: t('common.select-parent-folder')
  }
  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  const currently_checked = params.workspace_provider.get_checked_files()
  const is_multi_root =
    params.workspace_provider.get_workspace_roots().length > 1

  const mapped_items = await map_files_to_quick_pick_items({
    files: params.matched_items,
    is_multi_root,
    workspace_provider: params.workspace_provider,
    open_file_button,
    add_parent_folder_button
  })

  const quick_pick_items = group_quick_pick_items({
    mapped_items,
    is_multi_root,
    workspace_provider: params.workspace_provider
  }) as (vscode.QuickPickItem & { file_path?: string; checked?: boolean })[]

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { file_path?: string; checked?: boolean }
  >()
  quick_pick.items = quick_pick_items
  quick_pick.selectedItems = quick_pick_items.filter((item) => {
    if (!item.file_path) return false
    if (item.checked !== undefined) {
      return item.checked
    }
    return currently_checked.includes(item.file_path)
  })
  quick_pick.canSelectMany = true
  quick_pick.matchOnDescription = true
  quick_pick.title = params.title

  const base_placeholder = t('feature.search-files.select-files')

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

  const buttons: vscode.QuickInputButton[] = []
  if (params.show_back_button) buttons.push(vscode.QuickInputButtons.Back)
  buttons.push(close_button)
  quick_pick.buttons = buttons

  let is_showing_folder_quick_pick = false

  return new Promise((resolve) => {
    let is_resolved = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        is_resolved = true
        resolve('back')
        quick_pick.hide()
      } else if (button === close_button) {
        is_resolved = true
        resolve(undefined)
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      is_resolved = true
      resolve({
        selected_paths: quick_pick.selectedItems
          .map((item) => item.file_path)
          .filter((p): p is string => p !== undefined),
        matched_paths: params.matched_items.map((m) => m.path),
        title: params.title
      })
      quick_pick.hide()
    })

    quick_pick.onDidHide(() => {
      if (is_showing_folder_quick_pick) return
      if (!is_resolved) {
        resolve(params.show_back_button ? 'back' : undefined)
      }
      quick_pick.dispose()
    })

    quick_pick.onDidTriggerItemButton(async (e) => {
      if (!e.item.file_path) return
      if (e.button === open_file_button) {
        try {
          const doc = await vscode.workspace.openTextDocument(e.item.file_path)
          await vscode.window.showTextDocument(doc, {
            preview: true
          })
        } catch (error) {
          vscode.window.showErrorMessage(
            t('feature.search-files.error.opening-file', {
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

        handle_parent_folder_result({
          result,
          quick_pick,
          workspace_provider: params.workspace_provider,
          item: e.item,
          on_cancel: () => {
            is_resolved = true
            resolve(undefined)
          }
        })
      }
    })

    quick_pick.show()
  })
}

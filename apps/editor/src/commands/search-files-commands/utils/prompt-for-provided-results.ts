import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'
import { group_quick_pick_items } from '@/features/search-files/utils/group-quick-pick-items'
import { map_files_to_quick_pick_items } from '@/features/search-files/utils/map-files-to-quick-pick-items'
import { handle_parent_folder_result } from '@/features/search-files/utils/handle-parent-folder-result'
import { display_token_count } from '@/utils/display-token-count'

export const prompt_for_provided_results = async (params: {
  files: { path: string; checked: boolean }[]
  workspace_provider: WorkspaceProvider
  restored_selected_paths?: string[]
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | {
      action: 'search-in-results'
      matched_paths: string[]
      selected_paths: string[]
    }
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
  const search_in_results_button = {
    iconPath: new vscode.ThemeIcon('search'),
    tooltip: t('common.search-in-selected-results')
  }

  const is_multi_root =
    params.workspace_provider.get_workspace_roots().length > 1

  const mapped_items = await map_files_to_quick_pick_items({
    files: params.files,
    is_multi_root,
    workspace_provider: params.workspace_provider,
    open_file_button,
    add_parent_folder_button
  })

  const quick_pick_items = group_quick_pick_items({
    mapped_items,
    is_multi_root,
    workspace_provider: params.workspace_provider
  }) as (vscode.QuickPickItem & {
    file_path?: string
    checked?: boolean
  })[]

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { file_path?: string; checked?: boolean }
  >()
  quick_pick.items = quick_pick_items
  quick_pick.selectedItems = quick_pick_items.filter((item) => {
    if (!item.file_path) return false
    if (params.restored_selected_paths) {
      return params.restored_selected_paths.includes(item.file_path)
    }
    return item.checked
  })
  quick_pick.canSelectMany = true
  quick_pick.matchOnDescription = true
  const base_title = t('feature.search-files.results.intelligent')
  quick_pick.title = base_title

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
  quick_pick.buttons = [search_in_results_button, close_button]

  let is_showing_folder_quick_pick = false

  return new Promise<
    | { selected_paths: string[]; matched_paths: string[]; title: string }
    | {
        action: 'search-in-results'
        matched_paths: string[]
        selected_paths: string[]
      }
    | undefined
  >((resolve) => {
    let is_accepted = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === search_in_results_button) {
        const selected = quick_pick.selectedItems
          .map((item) => item.file_path)
          .filter((p): p is string => p !== undefined)

        if (selected.length == 0) {
          vscode.window.showInformationMessage(
            t('feature.search-files.info.no-files-selected')
          )
          return
        }

        is_accepted = true
        resolve({
          action: 'search-in-results',
          matched_paths: selected,
          selected_paths: selected
        })
        quick_pick.hide()
      } else if (button === close_button) {
        resolve(undefined)
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      is_accepted = true
      resolve({
        selected_paths: quick_pick.selectedItems
          .map((item) => item.file_path)
          .filter((p): p is string => p !== undefined),
        matched_paths: params.files.map((f) => f.path),
        title: base_title
      })
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
      if (!e.item.file_path) return
      if (e.button === open_file_button) {
        try {
          const doc = await vscode.workspace.openTextDocument(e.item.file_path)
          await vscode.window.showTextDocument(doc, { preview: true })
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
            is_accepted = true
            resolve(undefined)
          }
        })
      }
    })

    quick_pick.show()
  })
}

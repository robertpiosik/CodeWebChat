import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { FileAnalysisResult } from './analyze-files'
import { t } from '@/i18n'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'
import { group_quick_pick_items } from './group-quick-pick-items'
import { map_files_to_quick_pick_items } from './map-files-to-quick-pick-items'
import { handle_parent_folder_result } from './handle-parent-folder-result'

export const prompt_for_intelligent_search_results = async (params: {
  files: string[]
  extracted_files: string[]
  analysis: FileAnalysisResult
  workspace_provider: WorkspaceProvider
  restored_selected_paths?: string[]
  restored_unmatched_paths?: string[]
  is_search_in_selected?: boolean
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | {
      action: 'search-in-results'
      matched_paths: string[]
      selected_paths: string[]
      unmatched_paths: string[]
    }
  | 'back'
  | 'cancel'
> => {
  const absolute_paths: string[] = []

  for (const extracted of params.extracted_files) {
    const matched = params.analysis.files_data.find(
      (f) => f.display_path == extracted
    )
    if (matched) {
      absolute_paths.push(matched.file_path)
    } else {
      const roots = params.workspace_provider.get_workspace_roots()
      for (const root of roots) {
        const potential_abs = path.join(root, extracted)
        if (
          params.analysis.files_data.some((f) => f.file_path == potential_abs)
        ) {
          absolute_paths.push(potential_abs)
          break
        }
      }
    }
  }

  const unique_paths = [...new Set(absolute_paths)]

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }
  const add_parent_folder_button = {
    iconPath: new vscode.ThemeIcon('folder'),
    tooltip: t('common.select-parent-folder')
  }
  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
  }
  const search_in_results_button = {
    iconPath: new vscode.ThemeIcon('search'),
    tooltip: t('common.search-in-results')
  }

  const is_multi_root =
    params.workspace_provider.get_workspace_roots().length > 1

  const currently_checked = params.workspace_provider.get_checked_files()

  const unmatched_checked_files =
    params.restored_unmatched_paths ??
    (params.is_search_in_selected
      ? params.files.filter(
          (f) => currently_checked.includes(f) && !unique_paths.includes(f)
        )
      : [])

  const mapped_items = await map_files_to_quick_pick_items({
    files: unique_paths.map((path) => ({ path })),
    is_multi_root,
    workspace_provider: params.workspace_provider,
    open_file_button,
    add_parent_folder_button
  })

  const quick_pick_items = group_quick_pick_items({
    mapped_items,
    is_multi_root,
    workspace_provider: params.workspace_provider
  }) as (vscode.QuickPickItem & { file_path?: string })[]

  if (unmatched_checked_files.length > 0) {
    const mapped_unmatched_items = await map_files_to_quick_pick_items({
      files: unmatched_checked_files.map((path) => ({ path })),
      is_multi_root,
      workspace_provider: params.workspace_provider,
      open_file_button,
      add_parent_folder_button
    })

    const unmatched_quick_pick_items = group_quick_pick_items({
      mapped_items: mapped_unmatched_items,
      is_multi_root,
      workspace_provider: params.workspace_provider
    }) as (vscode.QuickPickItem & { file_path?: string })[]

    quick_pick_items.push({
      label: t('feature.search-files.results.unmatched'),
      kind: vscode.QuickPickItemKind.Separator
    })
    quick_pick_items.push(...unmatched_quick_pick_items)
  }

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { file_path?: string }
  >()
  quick_pick.items = quick_pick_items
  quick_pick.selectedItems = quick_pick_items.filter((item) => {
    if (!item.file_path) return false
    if (params.restored_selected_paths) {
      return params.restored_selected_paths.includes(item.file_path)
    }
    return (
      currently_checked.includes(item.file_path) &&
      !unmatched_checked_files.includes(item.file_path)
    )
  })
  quick_pick.canSelectMany = true

  const title = t('feature.search-files.results.intelligent')
  quick_pick.title = title

  quick_pick.placeholder = t('feature.search-files.select-files')
  quick_pick.ignoreFocusOut = true
  quick_pick.buttons = [
    vscode.QuickInputButtons.Back,
    search_in_results_button,
    close_button
  ]

  let is_showing_folder_quick_pick = false

  const list_selection = await new Promise<
    | { selected_paths: string[]; matched_paths: string[]; title: string }
    | {
        action: 'search-in-results'
        matched_paths: string[]
        selected_paths: string[]
        unmatched_paths: string[]
      }
    | 'back'
    | 'cancel'
  >((resolve) => {
    let is_resolved = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        is_resolved = true
        resolve('back')
        quick_pick.hide()
      } else if (button === search_in_results_button) {
        is_resolved = true
        resolve({
          action: 'search-in-results',
          matched_paths: [...unique_paths, ...unmatched_checked_files],
          selected_paths: quick_pick.selectedItems
            .map((item) => item.file_path)
            .filter((p): p is string => p !== undefined),
          unmatched_paths: unmatched_checked_files
        })
        quick_pick.hide()
      } else if (button === close_button) {
        is_resolved = true
        resolve('cancel')
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      is_resolved = true
      resolve({
        selected_paths: quick_pick.selectedItems
          .map((item) => item.file_path)
          .filter((p): p is string => p !== undefined),
        matched_paths: [...unique_paths, ...unmatched_checked_files],
        title
      })
      quick_pick.hide()
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
            is_resolved = true
            resolve('cancel')
          }
        })
      }
    })

    quick_pick.onDidHide(() => {
      if (is_showing_folder_quick_pick) return
      if (!is_resolved) {
        resolve('back')
      }
      quick_pick.dispose()
    })

    quick_pick.show()
  })

  return list_selection
}

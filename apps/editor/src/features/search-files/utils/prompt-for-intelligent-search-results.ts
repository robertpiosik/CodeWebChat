import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { display_token_count } from '@/utils/display-token-count'
import { FileAnalysisResult } from './analyze-files'
import { t } from '@/i18n'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'

export const prompt_for_intelligent_search_results = async (params: {
  extracted_files: string[]
  analysis: FileAnalysisResult
  workspace_provider: WorkspaceProvider
}): Promise<
  | { selected_paths: string[]; matched_paths: string[] }
  | { action: 'search_in_results'; matched_paths: string[] }
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

  const quick_pick_items = await Promise.all(
    unique_paths.map(async (file_path) => {
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)
      const relative_path = workspace_root
        ? path.relative(workspace_root, file_path)
        : file_path
      const dir_name = path.dirname(relative_path)
      const has_parent_folder = dir_name != '.'
      let display_dir = dir_name == '.' ? '' : dir_name

      if (
        workspace_root &&
        params.workspace_provider.get_workspace_roots().length > 1
      ) {
        const workspace_name =
          params.workspace_provider.get_workspace_name(workspace_root)
        display_dir = display_dir
          ? `${workspace_name}/${display_dir}`
          : workspace_name
      }

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
        buttons
      }
    })
  )

  const currently_checked = params.workspace_provider.get_checked_files()

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { file_path: string }
  >()
  quick_pick.items = quick_pick_items
  quick_pick.selectedItems = quick_pick_items.filter((item) =>
    currently_checked.includes(item.file_path)
  )
  quick_pick.canSelectMany = true

  quick_pick.title = t('feature.search-files.results.intelligent')

  quick_pick.placeholder = t('feature.search-files.select-files')
  quick_pick.ignoreFocusOut = true
  quick_pick.buttons = [
    vscode.QuickInputButtons.Back,
    search_in_results_button,
    close_button
  ]

  let is_showing_folder_quick_pick = false

  const list_selection = await new Promise<
    | { selected_paths: string[]; matched_paths: string[] }
    | { action: 'search_in_results'; matched_paths: string[] }
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
        resolve({ action: 'search_in_results', matched_paths: unique_paths })
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
        selected_paths: quick_pick.selectedItems.map((item) => item.file_path),
        matched_paths: unique_paths
      })
      quick_pick.hide()
    })

    quick_pick.onDidTriggerItemButton(async (e) => {
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

        if (
          result === 'added' ||
          result === 'back' ||
          result === 'no_folders' ||
          result === 'no_workspace_root'
        ) {
          const current_items = quick_pick.items
          let current_selected = quick_pick.selectedItems

          if (result === 'added') {
            const currently_checked =
              params.workspace_provider.get_checked_files()
            current_selected = current_items.filter(
              (item) =>
                currently_checked.includes(item.file_path) ||
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
          is_resolved = true
          resolve('cancel')
          quick_pick.dispose()
        }
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

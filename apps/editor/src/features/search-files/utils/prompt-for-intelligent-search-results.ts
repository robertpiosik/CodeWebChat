import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { display_token_count } from '@/utils/display-token-count'
import { FileAnalysisResult } from './analyze-files'
import { t } from '@/i18n'

export const prompt_for_intelligent_search_results = async (params: {
  extracted_files: string[]
  analysis: FileAnalysisResult
  workspace_provider: WorkspaceProvider
}): Promise<
  { selected_paths: string[]; matched_paths: string[] } | 'back' | 'cancel'
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
  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
  }

  const quick_pick_items = await Promise.all(
    unique_paths.map(async (file_path) => {
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)
      const relative_path = workspace_root
        ? path.relative(workspace_root, file_path)
        : file_path
      const dir_name = path.dirname(relative_path)
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

      return {
        label: path.basename(file_path),
        description: display_dir
          ? `${formatted_token_count} · ${display_dir}`
          : formatted_token_count,
        file_path,
        buttons: [open_file_button]
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
  quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

  const list_selection = await new Promise<
    { selected_paths: string[]; matched_paths: string[] } | 'back' | 'cancel'
  >((resolve) => {
    let is_resolved = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        is_resolved = true
        resolve('back')
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
      }
    })

    quick_pick.onDidHide(() => {
      if (!is_resolved) {
        resolve('back')
      }
      quick_pick.dispose()
    })

    quick_pick.show()
  })

  return list_selection
}

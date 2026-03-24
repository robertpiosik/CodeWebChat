import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { display_token_count } from '../../../utils/display-token-count'
import { FileAnalysisResult } from './analyze-workspace-files'
import { t } from '@/i18n'

export const show_results_and_apply = async (params: {
  extracted_files: string[]
  analysis: FileAnalysisResult
  workspace_provider: WorkspaceProvider
}): Promise<'success' | 'back' | 'cancel'> => {
  const currently_checked = params.workspace_provider.get_checked_files()
  const absolute_paths: string[] = []

  for (const rel_path of params.extracted_files) {
    const potential_abs = path.join(params.analysis.workspace_root, rel_path)
    if (fs.existsSync(potential_abs)) absolute_paths.push(potential_abs)
  }

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }
  const open_file_button = {
    iconPath: new vscode.ThemeIcon('go-to-file'),
    tooltip: t('common.go-to-file')
  }

  const quick_pick_items = await Promise.all(
    absolute_paths.map(async (file_path) => {
      const relative_path = path.relative(
        params.analysis.workspace_root,
        file_path
      )
      const dir_name = path.dirname(relative_path)
      const display_dir = dir_name === '.' ? '' : dir_name
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

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { file_path: string }
  >()
  quick_pick.items = quick_pick_items
  quick_pick.selectedItems = quick_pick_items.filter((item) =>
    currently_checked.includes(item.file_path)
  )
  quick_pick.canSelectMany = true
  quick_pick.title = t('command.find-relevant-files.quick-pick.title')
  quick_pick.placeholder = t(
    'command.find-relevant-files.quick-pick.placeholder'
  )
  quick_pick.ignoreFocusOut = true
  quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

  return new Promise<'success' | 'back' | 'cancel'>((resolve) => {
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

    quick_pick.onDidAccept(async () => {
      is_resolved = true
      const selected_paths = quick_pick.selectedItems.map(
        (item) => item.file_path
      )
      const unchecked_paths = absolute_paths.filter(
        (file_path) => !selected_paths.includes(file_path)
      )

      const paths_to_apply = [
        ...new Set([
          ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
          ...selected_paths
        ])
      ]
      await params.workspace_provider.set_checked_files(paths_to_apply)

      const newly_selected_count = selected_paths.filter(
        (p) => !currently_checked.includes(p)
      ).length
      vscode.window.showInformationMessage(
        t('command.find-relevant-files.success.added', {
          count: newly_selected_count
        })
      )

      resolve('success')
      quick_pick.hide()
    })

    quick_pick.onDidTriggerItemButton(async (e) => {
      if (e.button === open_file_button) {
        try {
          const doc = await vscode.workspace.openTextDocument(e.item.file_path)
          await vscode.window.showTextDocument(doc, { preview: true })
        } catch (error) {
          vscode.window.showErrorMessage(
            t('command.find-relevant-files.error.opening-file', {
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
}

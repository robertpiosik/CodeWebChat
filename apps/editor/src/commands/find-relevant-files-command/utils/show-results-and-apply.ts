import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { display_token_count } from '../../../utils/display-token-count'
import { FileAnalysisResult } from './analyze-workspace-files'
import { t } from '@/i18n'
import { dictionary } from '@shared/constants/dictionary'
import { LAST_FIND_RELEVANT_FILES_MERGE_REPLACE_OPTION_STATE_KEY } from '../../../constants/state-keys'

export const show_results_and_apply = async (params: {
  extracted_files: string[]
  analysis: FileAnalysisResult
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
}): Promise<'success' | 'back' | 'cancel'> => {
  const absolute_paths: string[] = []

  for (const rel_path of params.extracted_files) {
    const potential_abs = path.join(params.analysis.workspace_root, rel_path)
    if (fs.existsSync(potential_abs)) absolute_paths.push(potential_abs)
  }

  const files_in_searched_folder = params.analysis.files_data.map(
    (f) => f.file_path
  )

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
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path) ||
        params.analysis.workspace_root
      const relative_path = path.relative(workspace_root, file_path)
      const dir_name = path.dirname(relative_path)
      let display_dir = dir_name == '.' ? '' : dir_name

      if (params.workspace_provider.get_workspace_roots().length > 1) {
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

  while (true) {
    const currently_checked = params.workspace_provider.get_checked_files()

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

    const list_selection = await new Promise<
      | readonly (vscode.QuickPickItem & { file_path: string })[]
      | 'back'
      | 'cancel'
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
        resolve(quick_pick.selectedItems)
        quick_pick.hide()
      })

      quick_pick.onDidTriggerItemButton(async (e) => {
        if (e.button === open_file_button) {
          try {
            const doc = await vscode.workspace.openTextDocument(
              e.item.file_path
            )
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

    if (list_selection === 'back' || list_selection === 'cancel') {
      return list_selection
    }

    const selected_paths = list_selection.map((item) => item.file_path)
    const unchecked_paths = absolute_paths.filter(
      (file_path) => !selected_paths.includes(file_path)
    )

    let paths_to_apply: string[] = []
    let should_continue_loop = false

    const currently_checked_in_folder = currently_checked.filter((f) =>
      files_in_searched_folder.includes(f)
    )

    if (currently_checked_in_folder.length > 0) {
      const selected_paths_set = new Set(selected_paths)
      const is_identical =
        currently_checked_in_folder.length == selected_paths_set.size &&
        currently_checked_in_folder.every((file) =>
          selected_paths_set.has(file)
        )

      if (is_identical) {
        vscode.window.showInformationMessage(
          dictionary.information_message.CONTEXT_ALREADY_SET
        )
        return 'success'
      }

      const quick_pick_options = [
        {
          label: t('command.apply-context.action.replace.label'),
          description: t('command.apply-context.action.replace.description')
        },
        {
          label: t('command.apply-context.action.merge.label'),
          description: t('command.apply-context.action.merge.description')
        }
      ]

      const last_choice_label =
        params.extension_context.workspaceState.get<string>(
          LAST_FIND_RELEVANT_FILES_MERGE_REPLACE_OPTION_STATE_KEY
        )

      const quick_pick_merge = vscode.window.createQuickPick()
      quick_pick_merge.items = quick_pick_options
      quick_pick_merge.placeholder = t('command.apply-context.unstaged.apply', {
        count: selected_paths.length
      })
      quick_pick_merge.buttons = [vscode.QuickInputButtons.Back]

      if (last_choice_label) {
        const active_item = quick_pick_options.find(
          (opt) => opt.label === last_choice_label
        )
        if (active_item) {
          quick_pick_merge.activeItems = [active_item]
        }
      }

      const choice = await new Promise<
        vscode.QuickPickItem | 'back' | undefined
      >((resolve_choice) => {
        let is_accepted = false
        quick_pick_merge.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            resolve_choice('back')
            quick_pick_merge.hide()
          }
        })
        quick_pick_merge.onDidAccept(() => {
          is_accepted = true
          resolve_choice(quick_pick_merge.selectedItems[0])
          quick_pick_merge.hide()
        })
        quick_pick_merge.onDidHide(() => {
          if (!is_accepted) resolve_choice('back')
          quick_pick_merge.dispose()
        })
        quick_pick_merge.show()
      })

      if (choice === 'back') {
        should_continue_loop = true
      } else if (!choice) {
        return 'cancel'
      } else {
        await params.extension_context.workspaceState.update(
          LAST_FIND_RELEVANT_FILES_MERGE_REPLACE_OPTION_STATE_KEY,
          choice.label
        )

        if (choice.label == t('command.apply-context.action.merge.label')) {
          paths_to_apply = [
            ...new Set([
              ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
              ...selected_paths
            ])
          ]
        } else {
          paths_to_apply = [
            ...new Set([
              ...currently_checked.filter(
                (p) => !files_in_searched_folder.includes(p)
              ),
              ...selected_paths
            ])
          ]
        }
      }
    } else {
      paths_to_apply = [...new Set([...currently_checked, ...selected_paths])]
    }

    if (should_continue_loop) {
      continue
    }

    await params.workspace_provider.set_checked_files(paths_to_apply)

    vscode.window.showInformationMessage(
      t('command.find-relevant-files.success.added')
    )

    return 'success'
  }
}

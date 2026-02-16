import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { display_token_count } from '../../../utils/display-token-count'
import { LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../../../constants/state-keys'

export const handle_unstaged_files_source = async (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<'back' | void> => {
  try {
    const git_extension = vscode.extensions.getExtension('vscode.git')?.exports
    if (!git_extension) {
      vscode.window.showErrorMessage(
        dictionary.error_message.GIT_EXTENSION_NOT_FOUND
      )
      return
    }
    const git_api = git_extension.getAPI(1)
    if (!git_api) {
      vscode.window.showErrorMessage(
        dictionary.error_message.COULD_NOT_GET_GIT_API
      )
      return
    }

    if (git_api.repositories.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_GIT_REPOSITORY_FOUND_IN_WORKSPACE
      )
      return
    }

    const unstaged_file_paths: string[] = []
    for (const repo of git_api.repositories) {
      repo.state.workingTreeChanges.forEach((change: any) => {
        unstaged_file_paths.push(change.uri.fsPath)
      })
    }

    if (unstaged_file_paths.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_UNSTAGED_FILES_FOUND
      )
      return
    }

    const existing_unstaged_files = unstaged_file_paths.filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile()
      } catch {
        return false
      }
    })

    if (existing_unstaged_files.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_ACTIONABLE_UNSTAGED_FILES_FOUND
      )
      return
    }

    const workspace_roots = workspace_provider.get_workspace_roots()

    while (true) {
      const quick_pick_items = await Promise.all(
        existing_unstaged_files.map(async (file_path) => {
          const token_count =
            await workspace_provider.calculate_file_tokens(file_path)

          const formatted_token_count = display_token_count(token_count.total)
          const relative_path = path.relative(
            workspace_roots[0] || '',
            file_path
          )
          const dir_name = path.dirname(relative_path)
          const display_dir = dir_name == '.' ? '' : dir_name

          return {
            label: path.basename(file_path),
            description: `${formatted_token_count} · ${display_dir}`.trim(),
            picked: true,
            file_path
          }
        })
      )

      const quick_pick = vscode.window.createQuickPick<
        vscode.QuickPickItem & { file_path: string }
      >()
      quick_pick.title = 'Unstaged Files'
      quick_pick.placeholder = 'Select files to include'
      quick_pick.canSelectMany = true
      quick_pick.items = quick_pick_items
      quick_pick.selectedItems = quick_pick_items
      quick_pick.buttons = [vscode.QuickInputButtons.Back]

      const selected_items = await new Promise<
        | readonly (vscode.QuickPickItem & { file_path: string })[]
        | 'back'
        | undefined
      >((resolve) => {
        let is_accepted = false
        let did_trigger_back = false

        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            resolve('back')
            quick_pick.hide()
          }
        })

        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems)
          quick_pick.hide()
        })

        quick_pick.onDidHide(() => {
          if (!is_accepted && !did_trigger_back) {
            resolve('back')
          }
          quick_pick.dispose()
        })

        quick_pick.show()
      })

      if (selected_items == 'back') {
        return 'back'
      }

      if (!selected_items || selected_items.length == 0) {
        return
      }

      const selected_paths = selected_items.map((item) => item.file_path)
      const currently_checked = workspace_provider.get_checked_files()
      let paths_to_apply = selected_paths
      let should_continue = false

      if (currently_checked.length > 0) {
        const selected_paths_set = new Set(selected_paths)
        const all_current_files_in_new_context = currently_checked.every(
          (file) => selected_paths_set.has(file)
        )

        if (!all_current_files_in_new_context) {
          const quick_pick_options = [
            {
              label: 'Replace',
              description: 'Replace the current context with selected files'
            },
            {
              label: 'Merge',
              description: 'Merge selected files with the current context'
            }
          ]

          const last_choice_label =
            extension_context.workspaceState.get<string>(
              LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
            )

          const quick_pick_merge = vscode.window.createQuickPick()
          quick_pick_merge.items = quick_pick_options
          quick_pick_merge.placeholder = `How would you like to apply the ${selected_paths.length} selected files?`
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
          >((resolve) => {
            let is_accepted = false
            quick_pick_merge.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                resolve('back')
                quick_pick_merge.hide()
              }
            })
            quick_pick_merge.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick_merge.selectedItems[0])
              quick_pick_merge.hide()
            })
            quick_pick_merge.onDidHide(() => {
              if (!is_accepted) resolve('back')
              quick_pick_merge.dispose()
            })
            quick_pick_merge.show()
          })

          if (choice === 'back') {
            should_continue = true
          } else if (!choice) {
            return
          } else {
            await extension_context.workspaceState.update(
              LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
              choice.label
            )

            if (choice.label == 'Merge') {
              paths_to_apply = [
                ...new Set([...currently_checked, ...selected_paths])
              ]
            }
          }
        }
      }

      if (should_continue) {
        continue
      }

      Logger.info({
        message: `Selected ${selected_paths.length} unstaged file${
          selected_paths.length == 1 ? '' : 's'
        }.`,
        data: { paths: selected_paths }
      })

      await workspace_provider.set_checked_files(paths_to_apply)
      vscode.window.showInformationMessage(
        dictionary.information_message.SELECTED_FILES(paths_to_apply.length)
      )
      return
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_SELECT_UNSTAGED_FILES(
        error instanceof Error ? error.message : String(error)
      )
    )
    Logger.error({
      function_name: 'handle_unstaged_files_source',
      message: 'Failed to select unstaged files',
      data: error
    })
  }
}

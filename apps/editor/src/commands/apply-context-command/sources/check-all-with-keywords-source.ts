import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../../../constants/state-keys'

export const handle_check_all_with_keywords_source = async (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<'back' | void> => {
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const input_box = vscode.window.createInputBox()
      input_box.title = 'Keyword Search'
      input_box.prompt = 'Enter keywords separated by comma'
      input_box.placeholder = 'e.g. user, login, auth'
      input_box.ignoreFocusOut = true
      input_box.buttons = [vscode.QuickInputButtons.Back]

      const keywords_input = await new Promise<string | 'back' | undefined>(
        (resolve) => {
          let is_resolved = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            input_box.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                is_resolved = true
                resolve('back')
                input_box.hide()
              }
            }),
            input_box.onDidAccept(() => {
              const value = input_box.value.trim()
              if (value.length === 0) {
                input_box.validationMessage =
                  'Please enter at least one keyword'
                return
              }
              is_resolved = true
              resolve(value)
              input_box.hide()
            }),
            input_box.onDidChangeValue(() => {
              if (input_box.value.trim().length > 0) {
                input_box.validationMessage = undefined
              }
            }),
            input_box.onDidHide(() => {
              if (!is_resolved) {
                resolve('back')
              }
              disposables.forEach((d) => d.dispose())
              input_box.dispose()
            })
          )
          input_box.show()
        }
      )

      if (keywords_input === 'back') {
        return 'back'
      }

      if (!keywords_input) return

      const keywords = keywords_input
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0)

      if (keywords.length == 0) continue

      const roots = workspace_provider.get_workspace_roots()
      const all_files: string[] = []

      for (const root of roots) {
        const files = await workspace_provider.find_all_files(root)
        all_files.push(...files)
      }

      const matched_files: string[] = []

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Searching for keywords: ${keywords.join(', ')}...`,
          cancellable: true
        },
        async (progress, token) => {
          const total = all_files.length
          let processed = 0
          const increment = (1 / total) * 100

          for (const file_path of all_files) {
            if (token.isCancellationRequested) break

            try {
              // Skip large files (> 1MB) to avoid performance issues
              const stats = await fs.promises.stat(file_path)
              if (stats.size > 1024 * 1024) {
                processed++
                progress.report({
                  increment,
                  message: `${processed}/${total}`
                })
                continue
              }

              const content = await fs.promises.readFile(file_path, 'utf-8')
              const content_lower = content.toLowerCase()

              if (keywords.some((k) => content_lower.includes(k))) {
                matched_files.push(file_path)
              }
            } catch (error) {
              // Ignore read errors (binary files, permissions, etc.)
            }

            processed++
            progress.report({
              increment,
              message: `${processed}/${total}`
            })
          }
        }
      )

      if (matched_files.length == 0) {
        vscode.window.showInformationMessage(
          'No files found containing these keywords.'
        )
        continue
      }

      const open_file_button = {
        iconPath: new vscode.ThemeIcon('go-to-file'),
        tooltip: 'Open file'
      }

      // Inner loop for file selection
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const quick_pick_items = matched_files.map((file_path) => {
          const workspace_root =
            workspace_provider.get_workspace_root_for_file(file_path)
          const relative_path = workspace_root
            ? path.relative(workspace_root, file_path)
            : file_path

          const dir_name = path.dirname(relative_path)
          return {
            label: path.basename(file_path),
            description: dir_name == '.' ? '' : dir_name,
            file_path: file_path,
            buttons: [open_file_button]
          }
        })

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { file_path: string }
        >()
        quick_pick.items = quick_pick_items
        quick_pick.selectedItems = quick_pick_items
        quick_pick.canSelectMany = true
        quick_pick.placeholder = 'Select files to include'
        quick_pick.title = `Found ${matched_files.length} file${
          matched_files.length == 1 ? '' : 's'
        }`
        quick_pick.ignoreFocusOut = true
        quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const selected_items = await new Promise<
          | readonly (vscode.QuickPickItem & { file_path: string })[]
          | 'back'
          | undefined
        >((resolve) => {
          let is_accepted = false
          let did_trigger_back = false

          quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(quick_pick.selectedItems)
            quick_pick.hide()
          })

          quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              did_trigger_back = true
              resolve('back')
              quick_pick.hide()
            }
          })

          quick_pick.onDidHide(() => {
            if (!is_accepted && !did_trigger_back) {
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
                  preview: true
                })
              } catch (error) {
                vscode.window.showErrorMessage(`Error opening file: ${error}`)
              }
            }
          })

          quick_pick.show()
        })

        if (selected_items === 'back') {
          break // break inner loop to go back to keywords
        }

        if (!selected_items || selected_items.length == 0) {
          return
        }

        const selected_paths = selected_items.map((item) => item.file_path)
        const currently_checked = workspace_provider.get_checked_files()
        let paths_to_apply = selected_paths
        let should_continue_file_loop = false

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
              should_continue_file_loop = true
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

        if (should_continue_file_loop) {
          continue
        }

        Logger.info({
          message: `Selected ${selected_paths.length} files from keyword search.`,
          data: { paths: selected_paths }
        })

        await workspace_provider.set_checked_files(paths_to_apply)
        vscode.window.showInformationMessage(
          dictionary.information_message.SELECTED_FILES(paths_to_apply.length)
        )
        return
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Search failed: ${error instanceof Error ? error.message : String(error)}`
    )
    Logger.error({
      function_name: 'handle_check_all_with_keywords_source',
      message: 'Error searching keywords',
      data: error
    })
  }
}

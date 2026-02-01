import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../constants/state-keys'
import { dictionary } from '@shared/constants/dictionary'
import { search_files_by_keywords } from '../utils/search-files-by-keywords'

export const check_all_with_keywords_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkAllWithKeywords',
    async (item: any) => {
      const folder_path = item?.resourceUri?.fsPath

      try {
        const input_box = vscode.window.createInputBox()
        input_box.title = 'Keyword Search'
        input_box.prompt =
          'Enter keywords separated by comma (use & for AND, quotes for whole words)'
        input_box.placeholder = 'e.g. user, login&auth, "ignoreFocus"'

        const keywords_input = await new Promise<string | undefined>(
          (resolve) => {
            let is_resolved = false
            const disposables: vscode.Disposable[] = []

            disposables.push(
              input_box.onDidAccept(() => {
                const value = input_box.value.trim()
                if (value.length == 0) {
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
                  resolve(undefined)
                }
                disposables.forEach((d) => d.dispose())
                input_box.dispose()
              })
            )
            input_box.show()
          }
        )

        if (!keywords_input) return

        const keywords = keywords_input
          .split(',')
          .map((group) =>
            group
              .split('&')
              .map((k) => k.trim().toLowerCase())
              .filter((k) => k.length > 0)
          )
          .filter((group) => group.length > 0)

        if (keywords.length == 0) return

        let all_files: string[] = []

        if (folder_path) {
          all_files = await workspace_provider.find_all_files(folder_path)
        } else {
          const roots = workspace_provider.get_workspace_roots()
          for (const root of roots) {
            const files = await workspace_provider.find_all_files(root)
            all_files.push(...files)
          }
        }

        const matched_files = await search_files_by_keywords(
          all_files,
          keywords
        )

        if (matched_files.length == 0) {
          vscode.window.showInformationMessage(
            'No files found containing these keywords.'
          )
          return
        }

        const open_file_button = {
          iconPath: new vscode.ThemeIcon('go-to-file'),
          tooltip: 'Open file'
        }

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

        const selected_items = await new Promise<
          readonly (vscode.QuickPickItem & { file_path: string })[] | undefined
        >((resolve) => {
          let is_accepted = false

          quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(quick_pick.selectedItems)
            quick_pick.hide()
          })

          quick_pick.onDidHide(() => {
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
                  preview: true
                })
              } catch (error) {
                vscode.window.showErrorMessage(`Error opening file: ${error}`)
              }
            }
          })

          quick_pick.show()
        })

        if (!selected_items || selected_items.length == 0) {
          return
        }

        const selected_paths = selected_items.map((item) => item.file_path)
        const currently_checked = workspace_provider.get_checked_files()

        let files_outside_search_folder: string[] = []
        let files_inside_search_folder: string[] = []

        if (folder_path) {
          files_outside_search_folder = currently_checked.filter((file) => {
            const relative = path.relative(folder_path, file)
            return relative.startsWith('..') || path.isAbsolute(relative)
          })
          files_inside_search_folder = currently_checked.filter((file) => {
            const relative = path.relative(folder_path, file)
            return !relative.startsWith('..') && !path.isAbsolute(relative)
          })
        } else {
          files_inside_search_folder = currently_checked
        }

        let paths_to_apply = [...files_outside_search_folder, ...selected_paths]

        if (files_inside_search_folder.length > 0) {
          const selected_paths_set = new Set(selected_paths)
          const all_current_files_in_new_context =
            files_inside_search_folder.every((file) =>
              selected_paths_set.has(file)
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

            const quick_pick_apply = vscode.window.createQuickPick()
            quick_pick_apply.items = quick_pick_options
            quick_pick_apply.placeholder = `How would you like to apply the ${selected_paths.length} selected files?`

            if (last_choice_label) {
              const active_item = quick_pick_options.find(
                (opt) => opt.label === last_choice_label
              )
              if (active_item) {
                quick_pick_apply.activeItems = [active_item]
              }
            }

            const choice = await new Promise<vscode.QuickPickItem | undefined>(
              (resolve) => {
                let is_accepted = false
                quick_pick_apply.onDidAccept(() => {
                  is_accepted = true
                  resolve(quick_pick_apply.selectedItems[0])
                  quick_pick_apply.hide()
                })
                quick_pick_apply.onDidHide(() => {
                  if (!is_accepted) resolve(undefined)
                  quick_pick_apply.dispose()
                })
                quick_pick_apply.show()
              }
            )

            if (!choice) return

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

        Logger.info({
          message: `Selected ${selected_paths.length} files from keyword search in folder.`,
          data: { paths: selected_paths, folder: folder_path }
        })

        await workspace_provider.set_checked_files(paths_to_apply)
        vscode.window.showInformationMessage(
          dictionary.information_message.SELECTED_FILES(
            paths_to_apply.length - files_outside_search_folder.length
          )
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          `Search failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'check_all_with_keywords_command',
          message: 'Error searching keywords in folder',
          data: error
        })
      }
    }
  )
}

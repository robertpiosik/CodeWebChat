import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import {
  LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
  LAST_SEARCH_FILES_FOR_CONTEXT_QUERY_STATE_KEY
} from '../constants/state-keys'
import { display_token_count } from '../utils/display-token-count'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '../i18n'

export const search_files_for_context_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  const search_handler = async (item?: any) => {
    let folder_path = item?.resourceUri?.fsPath

    if (folder_path) {
      try {
        const stats = await fs.promises.stat(folder_path)
        if (!stats.isDirectory()) {
          folder_path = path.dirname(folder_path)
        }
      } catch (error) {
        // If we can't validate the path, ignore it and let logic fall back to workspace roots
        folder_path = undefined
      }
    }
    let initial_keywords =
      extension_context.workspaceState.get<string>(
        LAST_SEARCH_FILES_FOR_CONTEXT_QUERY_STATE_KEY
      ) || ''

    let skip_input = false
    const is_context_menu = item !== undefined

    if (is_context_menu) {
      const active_editor = vscode.window.activeTextEditor
      if (active_editor) {
        const selection = active_editor.selection
        if (!selection.isEmpty) {
          const selected_text = active_editor.document.getText(selection).trim()
          if (selected_text.length > 0) {
            initial_keywords = selected_text
            skip_input = true
          }
        }
      }
    }

    while (true) {
      try {
        const close_button = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
        }

        let keywords_input: string | undefined

        if (skip_input) {
          keywords_input = initial_keywords
          skip_input = false
        } else {
          const input_box = vscode.window.createInputBox()
          input_box.title = t('command.search.title')
          input_box.prompt = t('command.search.prompt')
          input_box.placeholder = t('command.search.placeholder')
          input_box.value = initial_keywords

          input_box.buttons = [close_button]

          const result = await new Promise<{ value: string | undefined }>(
            (resolve) => {
              let is_resolved = false
              const disposables: vscode.Disposable[] = []

              disposables.push(
                input_box.onDidTriggerButton((button) => {
                  if (button === close_button) {
                    resolve({ value: undefined })
                    input_box.hide()
                  }
                }),
                input_box.onDidAccept(() => {
                  const value = input_box.value.trim()
                  if (value.length == 0) {
                    input_box.validationMessage = t(
                      'command.search.validation-empty'
                    )
                    return
                  }
                  is_resolved = true
                  resolve({ value })
                  input_box.hide()
                }),
                input_box.onDidChangeValue(() => {
                  if (input_box.value.trim().length > 0) {
                    input_box.validationMessage = undefined
                  }
                }),
                input_box.onDidHide(() => {
                  if (!is_resolved) {
                    resolve({ value: undefined })
                  }
                  disposables.forEach((d) => d.dispose())
                  input_box.dispose()
                })
              )
              input_box.show()
            }
          )

          keywords_input = result.value
        }

        if (!keywords_input) return

        await extension_context.workspaceState.update(
          LAST_SEARCH_FILES_FOR_CONTEXT_QUERY_STATE_KEY,
          keywords_input
        )

        initial_keywords = keywords_input

        const search_term = keywords_input.trim()
        if (search_term.length == 0) return

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

        const matched_files = await search_files_by_keywords({
          files: all_files,
          search_term
        })

        if (matched_files.length == 0) {
          vscode.window.showInformationMessage(t('command.search.no-files'))
          continue
        }

        const open_file_button = {
          iconPath: new vscode.ThemeIcon('go-to-file'),
          tooltip: t('common.go-to-file')
        }

        const currently_checked = workspace_provider.get_checked_files()

        const quick_pick_items = await Promise.all(
          matched_files.map(async (file_path) => {
            const workspace_root =
              workspace_provider.get_workspace_root_for_file(file_path)
            const relative_path = workspace_root
              ? path.relative(workspace_root, file_path)
              : file_path

            const dir_name = path.dirname(relative_path)
            const display_dir = dir_name == '.' ? '' : dir_name

            const token_count =
              await workspace_provider.calculate_file_tokens(file_path)
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
        quick_pick.matchOnDescription = true
        quick_pick.placeholder = t('command.search.select-files')
        quick_pick.title = t('command.search.results')
        quick_pick.ignoreFocusOut = true
        quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

        const selected_items = await new Promise<
          | readonly (vscode.QuickPickItem & { file_path: string })[]
          | undefined
          | 'back'
        >((resolve) => {
          let is_accepted = false

          quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              resolve('back')
              quick_pick.hide()
            } else if (button === close_button) {
              resolve(undefined)
              quick_pick.hide()
            }
          })

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

                const text = doc.getText()
                const regex = create_search_regex(search_term)
                const match = regex.exec(text)

                let selection: vscode.Range | undefined
                if (match) {
                  const start_pos = doc.positionAt(match.index)
                  const end_pos = doc.positionAt(match.index + match[0].length)
                  selection = new vscode.Range(start_pos, end_pos)
                }

                await vscode.window.showTextDocument(doc, {
                  preview: true,
                  selection
                })
              } catch (error) {
                vscode.window.showErrorMessage(
                  t('command.context.check-references.error-opening', {
                    error: String(error)
                  })
                )
              }
            }
          })

          quick_pick.show()
        })

        if (selected_items === 'back') {
          continue
        }

        if (!selected_items || selected_items.length == 0) {
          return
        }

        const selected_paths = (
          selected_items as (vscode.QuickPickItem & { file_path: string })[]
        ).map((item) => item.file_path)

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
                label: t('command.search.replace'),
                description: t('command.search.replace-description')
              },
              {
                label: t('command.search.merge'),
                description: t('command.search.merge-description')
              }
            ]

            const last_choice_label =
              extension_context.workspaceState.get<string>(
                LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
              )

            const quick_pick_apply = vscode.window.createQuickPick()
            quick_pick_apply.items = quick_pick_options
            quick_pick_apply.placeholder = t(
              'command.search.apply-placeholder',
              { count: selected_paths.length }
            )
            quick_pick_apply.ignoreFocusOut = true

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

            if (choice.label == t('command.search.merge')) {
              paths_to_apply = [
                ...new Set([...currently_checked, ...selected_paths])
              ]
            }
          }
        }

        Logger.info({
          message: `Selected ${selected_paths.length} files from search in folder.`,
          data: { paths: selected_paths, folder: folder_path }
        })

        await workspace_provider.set_checked_files(paths_to_apply)

        const newly_selected_count = selected_paths.filter(
          (p) => !currently_checked.includes(p)
        ).length

        vscode.window.showInformationMessage(
          dictionary.information_message.ADDED_FILES_TO_CONTEXT(
            newly_selected_count
          )
        )
        break
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.search.failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
        Logger.error({
          function_name: 'search_files_for_context_command',
          message: 'Error searching files for context',
          data: error
        })
        break
      }
    }
  }

  return [
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesForContext',
      (item?: any) => search_handler(item)
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesForContextFromDirectory',
      (item: any) => search_handler(item)
    )
  ]
}

const search_files_by_keywords = async (params: {
  files: string[]
  search_term: string
}): Promise<string[]> => {
  const matched_files: string[] = []

  const regex = create_search_regex(params.search_term)

  for (const file_path of params.files) {
    try {
      const file_name = path.basename(file_path)

      if (regex.test(file_name)) {
        matched_files.push(file_path)
        continue
      }

      const stats = await fs.promises.stat(file_path)
      if (stats.size > 1024 * 1024) {
        continue
      }

      const content = await fs.promises.readFile(file_path, 'utf-8')

      if (regex.test(content)) {
        matched_files.push(file_path)
      }
    } catch (error) {
      Logger.error({
        function_name: 'search_files_by_keywords',
        message: `Error reading file during search: ${file_path}`,
        data: error
      })
    }
  }

  return matched_files
}

const create_search_regex = (search_term: string): RegExp => {
  let actual_term = search_term
  let match_whole_word = false

  if (
    actual_term.length >= 2 &&
    actual_term.startsWith('"') &&
    actual_term.endsWith('"')
  ) {
    match_whole_word = true
    actual_term = actual_term.slice(1, -1)
  }

  const escaped_term = actual_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let pattern = escaped_term.replace(/\s+/g, '\\s+')

  if (match_whole_word) {
    pattern = `\\b${pattern}\\b`
  }

  return new RegExp(pattern, 'mi')
}

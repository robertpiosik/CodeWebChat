import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { LAST_APPLY_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../constants/state-keys'
import { get_git_repository } from '@/utils/git-repository-utils'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'
import { display_token_count } from '@/utils/display-token-count'
import { search_files } from '@/features/search-files'

export const select_changed_files_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectChangedFiles',
    async () => {
      try {
        const repository = await get_git_repository()
        if (!repository) {
          return
        }

        let last_selected_branch_name: string | undefined

        while (true) {
          let branches_output: string = ''
          try {
            branches_output = execSync(`git branch --sort=-committerdate`, {
              cwd: repository.rootUri.fsPath,
              encoding: 'utf-8'
            })
              .toString()
              .trim()
          } catch (e) {
            // Error handled below
          }

          if (!branches_output) {
            vscode.window.showInformationMessage(
              t('command.select-changed-files.no-branches')
            )
            return
          }

          const branches = branches_output
            .split('\n')
            .filter((line) => !line.startsWith('* '))
            .map((line) => {
              const name = line.trim()
              return {
                label: name,
                name
              }
            })
            .filter((b) => b.name.length > 0)

          if (branches.length === 0) {
            vscode.window.showInformationMessage(
              t('command.select-changed-files.no-other-branches')
            )
            return
          }

          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { name: string }
          >()
          quick_pick.title = t('command.select-changed-files.title')
          quick_pick.items = branches
          quick_pick.placeholder = t('command.select-changed-files.select')
          quick_pick.matchOnDetail = true
          quick_pick.buttons = [
            { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
          ]

          if (last_selected_branch_name) {
            const active_item = branches.find(
              (c) => c.name === last_selected_branch_name
            )
            if (active_item) {
              quick_pick.activeItems = [active_item]
            }
          }

          const selected_branch = await new Promise<
            (vscode.QuickPickItem & { name: string }) | 'back' | undefined
          >((resolve) => {
            let is_accepted = false
            const disposables: vscode.Disposable[] = []

            disposables.push(
              quick_pick.onDidTriggerButton((button) => {
                if (button === vscode.QuickInputButtons.Back) {
                  resolve('back')
                  quick_pick.hide()
                } else {
                  resolve(undefined)
                  quick_pick.hide()
                }
              }),
              quick_pick.onDidAccept(() => {
                is_accepted = true
                resolve(quick_pick.selectedItems[0])
                quick_pick.hide()
              }),
              quick_pick.onDidHide(() => {
                if (!is_accepted) {
                  resolve('back')
                }
                disposables.forEach((d) => d.dispose())
                quick_pick.dispose()
              })
            )
            quick_pick.show()
          })

          if (selected_branch === 'back' || !selected_branch) {
            return
          }

          last_selected_branch_name = selected_branch.name

          let files_output = ''
          try {
            files_output = execSync(
              `git diff --name-only ${selected_branch.name}`,
              {
                cwd: repository.rootUri.fsPath,
                encoding: 'utf-8'
              }
            )
              .toString()
              .trim()
          } catch (e) {
            // ignore empty output
          }

          if (!files_output) {
            vscode.window.showInformationMessage(
              t('command.select-changed-files.no-modified')
            )
            continue
          }

          const files = files_output
            .split('\n')
            .map((f) => f.trim())
            .filter((f) => f.length > 0)

          const valid_files = files
            .map((f) => {
              const absolute_path = path.join(repository.rootUri.fsPath, f)
              return {
                relative_path: f,
                absolute_path,
                exists:
                  fs.existsSync(absolute_path) &&
                  fs.statSync(absolute_path).isFile()
              }
            })
            .filter((f) => f.exists)

          if (valid_files.length === 0) {
            vscode.window.showInformationMessage(
              t('command.select-changed-files.no-valid')
            )
            continue
          }

          // Inner loop for file selection
          while (true) {
            const currently_checked = workspace_provider.get_checked_files()
            const currently_checked_set = new Set(currently_checked)

            const file_items = await Promise.all(
              valid_files.map(async (f) => {
                const token_count =
                  await workspace_provider.calculate_file_tokens(
                    f.absolute_path
                  )
                const formatted_token_count = display_token_count(
                  token_count.total
                )
                const dir_name = path.dirname(f.relative_path)
                const display_dir = dir_name === '.' ? '' : dir_name

                return {
                  label: path.basename(f.relative_path),
                  description: display_dir
                    ? `${formatted_token_count} · ${display_dir}`
                    : formatted_token_count,
                  picked: currently_checked_set.has(f.absolute_path),
                  file_path: f.absolute_path,
                  token_count: token_count.total
                }
              })
            )

            const quick_pick_files = vscode.window.createQuickPick<any>()
            quick_pick_files.canSelectMany = true
            quick_pick_files.items = file_items
            quick_pick_files.selectedItems = file_items.filter((i) => i.picked)
            quick_pick_files.title = t(
              'command.select-changed-files.files-modified',
              {
                branch: selected_branch.name
              }
            )

            const update_placeholder = () => {
              const total = quick_pick_files.selectedItems.reduce(
                (sum: number, item: any) => sum + item.token_count,
                0
              )
              const total_text =
                total > 0
                  ? ` (totalling ${display_token_count(total)} tokens)`
                  : ''
              quick_pick_files.placeholder = `${t(
                'command.select-changed-files.select-files'
              )}${total_text}`
            }
            update_placeholder()
            quick_pick_files.onDidChangeSelection(update_placeholder)

            const search_button = {
              iconPath: new vscode.ThemeIcon('search'),
              tooltip: t('common.search-in-results')
            }

            const close_button = {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: t('common.close')
            }

            quick_pick_files.buttons = [
              vscode.QuickInputButtons.Back,
              search_button,
              close_button
            ]
            quick_pick_files.ignoreFocusOut = true

            const selected_files = await new Promise<
              any[] | 'back' | undefined | 'search'
            >((resolve) => {
              let is_resolved = false
              const disposables: vscode.Disposable[] = []

              disposables.push(
                quick_pick_files.onDidTriggerButton((button) => {
                  if (button === vscode.QuickInputButtons.Back) {
                    is_resolved = true
                    resolve('back')
                    quick_pick_files.hide()
                  } else if (button === search_button) {
                    is_resolved = true
                    resolve('search')
                    quick_pick_files.hide()
                  } else if (button === close_button) {
                    is_resolved = true
                    resolve(undefined)
                    quick_pick_files.hide()
                  }
                }),
                quick_pick_files.onDidAccept(() => {
                  is_resolved = true
                  resolve(Array.from(quick_pick_files.selectedItems))
                  quick_pick_files.hide()
                }),
                quick_pick_files.onDidHide(() => {
                  if (!is_resolved) {
                    resolve('back')
                  }
                  disposables.forEach((d) => d.dispose())
                  quick_pick_files.dispose()
                })
              )

              quick_pick_files.show()
            })

            if (selected_files === 'back') {
              break // break inner loop
            }

            if (!selected_files) {
              return
            }

            let selected_paths: string[] = []

            if (selected_files === 'search') {
              const search_result = await search_files({
                get_files: async () => valid_files.map((f) => f.absolute_path),
                workspace_provider,
                extension_context,
                show_back_button: true,
                disable_semantic: true
              })

              if (search_result === 'back') {
                continue
              }

              if (!search_result) {
                return
              }

              selected_paths = search_result.selected_paths
            } else {
              if (selected_files.length === 0) {
                return
              }
              selected_paths = selected_files.map((item) => item.file_path)
            }

            if (selected_paths.length === 0) {
              return
            }

            let paths_to_apply = selected_paths
            let should_continue_file_loop = false

            if (currently_checked.length > 0) {
              const selected_paths_set = new Set(selected_paths)
              const is_identical =
                currently_checked.length === selected_paths_set.size &&
                currently_checked.every((file) => selected_paths_set.has(file))

              if (is_identical) {
                vscode.window.showInformationMessage(
                  dictionary.information_message.CONTEXT_ALREADY_SET
                )
                return
              }

              if (!is_identical) {
                const quick_pick_options = [
                  {
                    label: t('command.select-changed-files.replace'),
                    description: t(
                      'command.select-changed-files.replace-description'
                    )
                  },
                  {
                    label: t('command.select-changed-files.merge'),
                    description: t(
                      'command.select-changed-files.merge-description'
                    )
                  }
                ]

                const last_choice_label =
                  extension_context.workspaceState.get<string>(
                    LAST_APPLY_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
                  )

                const quick_pick_merge = vscode.window.createQuickPick()
                quick_pick_merge.items = quick_pick_options
                quick_pick_merge.placeholder = t(
                  'command.select-changed-files.apply',
                  {
                    branch: selected_branch.name
                  }
                )
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
                    LAST_APPLY_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
                    choice.label
                  )

                  if (
                    choice.label === t('command.select-changed-files.merge')
                  ) {
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

            await workspace_provider.set_checked_files(paths_to_apply)

            vscode.window.showInformationMessage(
              dictionary.information_message.SELECTED_FILES(
                paths_to_apply.length
              )
            )
            return
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to load changed files: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'select_changed_files_command',
          message: 'Error handling changed files command',
          data: error
        })
      }
    }
  )
}

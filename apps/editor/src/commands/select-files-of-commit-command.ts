import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { GIT_LOG_SINCE_DURATION } from '../constants/values'
import { get_git_repository } from '@/utils/git-repository-utils'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'
import { display_token_count } from '@/utils/display-token-count'
import { search_files } from '@/features/search-files'
import { AsciiTree } from '@/utils/ascii-tree'
import { WebSocketManager } from '@/services/websocket-manager'
import { show_parent_folder_quick_pick } from '@/utils/show-parent-folder-quick-pick'

export const select_files_of_commit_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  websocket_manager: WebSocketManager
): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectFilesOfCommit',
    async () => {
      try {
        const repository = await get_git_repository()
        if (!repository) {
          return
        }

        let last_selected_commit_hash: string | undefined

        while (true) {
          const log_output = execSync(
            `git log --since="${GIT_LOG_SINCE_DURATION}" --pretty=format:"%H|%s|%ar"`,
            {
              cwd: repository.rootUri.fsPath,
              encoding: 'utf-8'
            }
          )
            .toString()
            .trim()

          if (!log_output) {
            vscode.window.showInformationMessage(
              t('command.select-files-of-commit.no-commits')
            )
            return
          }

          const commits = log_output.split('\n').map((line) => {
            const [hash, subject, relative_date] = line.split('|')
            return {
              label: hash,
              detail: subject,
              description: relative_date,
              hash
            }
          })

          const ahead_of_branch_item = {
            label: `$(git-branch) ${t('command.select-files-of-commit.ahead-of-branch')}`,
            detail: '',
            description: '',
            hash: 'ahead-of-branch'
          }

          const separator_item: vscode.QuickPickItem & { hash: string } = {
            label: '',
            kind: vscode.QuickPickItemKind.Separator,
            hash: 'separator'
          }

          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { hash: string }
          >()
          quick_pick.title = t('command.select-files-of-commit.title')

          const all_items = [ahead_of_branch_item, separator_item, ...commits]
          quick_pick.items = all_items

          quick_pick.placeholder = t('command.select-files-of-commit.select')
          quick_pick.matchOnDetail = true
          quick_pick.buttons = [
            { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
          ]

          if (last_selected_commit_hash) {
            const active_item = quick_pick.items.find(
              (c) => c.hash === last_selected_commit_hash
            )
            if (active_item) {
              quick_pick.activeItems = [active_item]
            }
          }

          const selected_commit = await new Promise<
            (vscode.QuickPickItem & { hash: string }) | 'back' | undefined
          >((resolve) => {
            let is_accepted = false
            const disposables: vscode.Disposable[] = []

            disposables.push(
              quick_pick.onDidChangeValue((value) => {
                if (value.trim().length > 0) {
                  quick_pick.items = commits
                } else {
                  quick_pick.items = all_items
                }
              }),
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

          if (selected_commit == 'back' || !selected_commit) {
            return
          }

          last_selected_commit_hash = selected_commit.hash

          while (true) {
            let files_output = ''
            let is_ahead_of_branch = false
            let branch_name = ''

            if (selected_commit.hash == 'ahead-of-branch') {
              let branches_output: string = ''
              try {
                branches_output = execSync(`git branch --sort=-committerdate`, {
                  cwd: repository.rootUri.fsPath,
                  encoding: 'utf-8'
                })
                  .toString()
                  .trim()
              } catch (e) {
                // ignore empty output
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
                  t('command.select-files-of-commit.no-other-branches')
                )
                break // back to commit selection
              }

              const branch_qp = vscode.window.createQuickPick<
                vscode.QuickPickItem & { name: string }
              >()
              branch_qp.title = t('command.select-files-of-commit.branches')
              branch_qp.items = branches
              branch_qp.placeholder = t(
                'command.select-files-of-commit.select-branch'
              )
              branch_qp.buttons = [
                vscode.QuickInputButtons.Back,
                { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
              ]

              const selected_branch = await new Promise<
                (vscode.QuickPickItem & { name: string }) | 'back' | undefined
              >((resolve) => {
                let is_accepted = false
                const disposables: vscode.Disposable[] = []

                disposables.push(
                  branch_qp.onDidTriggerButton((button) => {
                    if (button === vscode.QuickInputButtons.Back) {
                      resolve('back')
                      branch_qp.hide()
                    } else {
                      resolve(undefined)
                      branch_qp.hide()
                    }
                  }),
                  branch_qp.onDidAccept(() => {
                    is_accepted = true
                    resolve(branch_qp.selectedItems[0])
                    branch_qp.hide()
                  }),
                  branch_qp.onDidHide(() => {
                    if (!is_accepted) {
                      resolve('back')
                    }
                    disposables.forEach((d) => d.dispose())
                    branch_qp.dispose()
                  })
                )
                branch_qp.show()
              })

              if (selected_branch === 'back') {
                break // back to commit selection
              }

              if (!selected_branch) {
                return
              }

              try {
                files_output = execSync(
                  `git log ${selected_branch.name}..HEAD --name-only --pretty="format:%B"`,
                  {
                    cwd: repository.rootUri.fsPath,
                    encoding: 'utf-8'
                  }
                )
                  .toString()
                  .trim()
              } catch (e) {
                // ignore
              }

              is_ahead_of_branch = true
              branch_name = selected_branch.name

              if (!files_output) {
                vscode.window.showInformationMessage(
                  t('command.select-files-of-commit.no-modified')
                )
                continue // retry branch selection
              }
            } else {
              try {
                files_output = execSync(
                  `git show --name-only --pretty="format:%B" ${selected_commit.hash}`,
                  {
                    cwd: repository.rootUri.fsPath,
                    encoding: 'utf-8'
                  }
                )
                  .toString()
                  .trim()
              } catch (e) {
                // ignore
              }

              if (!files_output) {
                vscode.window.showInformationMessage(
                  t('command.select-files-of-commit.no-modified')
                )
                break // back to commit selection
              }
            }

            const normal_files_set = new Set<string>()
            const lines = files_output.split('\n')
            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed.length > 0) {
                normal_files_set.add(trimmed)
              }
            }

            const ascii_files_set = new Set<string>()
            const ascii_paths = AsciiTree.extract_paths(files_output)
            ascii_paths.forEach((p) => {
              if (!normal_files_set.has(p)) {
                ascii_files_set.add(p)
              }
            })

            const process_files = (file_set: Set<string>) => {
              return Array.from(file_set)
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
            }

            const valid_normal_files = process_files(normal_files_set)
            const valid_ascii_files = process_files(ascii_files_set)

            const valid_files = [...valid_normal_files, ...valid_ascii_files]

            if (valid_files.length === 0) {
              vscode.window.showInformationMessage(
                t('command.select-files-of-commit.no-valid')
              )
              if (is_ahead_of_branch) {
                continue // retry branch selection
              } else {
                break // back to commit selection
              }
            }

            let file_action: 'back' | 'finished' = 'finished'

            // Inner loop for file selection
            while (true) {
              const currently_checked = workspace_provider.get_checked_files()
              const currently_checked_set = new Set(currently_checked)

              const create_items = async (files: typeof valid_normal_files) => {
                return await Promise.all(
                  files.map(async (f) => {
                    const token_count =
                      await workspace_provider.calculate_file_tokens(
                        f.absolute_path
                      )
                    const formatted_token_count = display_token_count(
                      token_count.total
                    )
                    const dir_name = path.dirname(f.relative_path)
                    const display_dir = dir_name === '.' ? '' : dir_name
                    const has_parent_folder = dir_name !== '.'

                    const buttons: vscode.QuickInputButton[] = []

                    if (has_parent_folder) {
                      buttons.push({
                        iconPath: new vscode.ThemeIcon('folder'),
                        tooltip: t('common.select-parent-folder')
                      })
                    }

                    buttons.push({
                      iconPath: new vscode.ThemeIcon('go-to-file'),
                      tooltip: t('common.go-to-file')
                    })

                    return {
                      label: path.basename(f.relative_path),
                      description: display_dir
                        ? `${formatted_token_count} · ${display_dir}`
                        : formatted_token_count,
                      picked: currently_checked_set.has(f.absolute_path),
                      file_path: f.absolute_path,
                      token_count: token_count.total,
                      buttons
                    }
                  })
                )
              }

              const normal_items = await create_items(valid_normal_files)
              const ascii_items = await create_items(valid_ascii_files)

              const file_items: any[] = []
              if (normal_items.length > 0) {
                file_items.push({
                  label: t('command.select-files-of-commit.committed-files'),
                  kind: vscode.QuickPickItemKind.Separator
                })
                file_items.push(...normal_items)
              }

              if (ascii_items.length > 0) {
                file_items.push({
                  label:
                    normal_items.length > 0
                      ? t('command.select-files-of-commit.context-files')
                      : t('command.select-files-of-commit.committed-files'),
                  kind: vscode.QuickPickItemKind.Separator
                })
                file_items.push(...ascii_items)
              }

              const quick_pick_files = vscode.window.createQuickPick<any>()
              quick_pick_files.canSelectMany = true
              quick_pick_files.items = file_items
              quick_pick_files.selectedItems = file_items.filter(
                (i) => i.picked
              )
              quick_pick_files.title = is_ahead_of_branch
                ? t('command.select-files-of-commit.files-ahead-of-branch', {
                    branch: branch_name
                  })
                : t('command.select-files-of-commit.files-modified')

              const base_placeholder = t(
                'command.select-files-of-commit.select-files'
              )

              const update_title = () => {
                const total = quick_pick_files.selectedItems.reduce(
                  (sum: number, item: any) => sum + item.token_count,
                  0
                )
                const total_text =
                  total > 0
                    ? ` (${t('common.totalling-tokens', {
                        tokens: display_token_count(total)
                      })})`
                    : ''
                quick_pick_files.placeholder = `${base_placeholder}${total_text}`
              }
              update_title()
              quick_pick_files.onDidChangeSelection(update_title)

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

              let is_showing_folder_quick_pick = false

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
                  quick_pick_files.onDidTriggerItemButton(async (e) => {
                    if (e.button.tooltip === t('common.go-to-file')) {
                      const uri = vscode.Uri.file(e.item.file_path)
                      vscode.window.showTextDocument(uri, { preview: true })
                    } else if (
                      e.button.tooltip === t('common.select-parent-folder')
                    ) {
                      is_showing_folder_quick_pick = true
                      quick_pick_files.hide()

                      const result = await show_parent_folder_quick_pick({
                        file_path: e.item.file_path,
                        workspace_provider
                      })

                      is_showing_folder_quick_pick = false

                      if (
                        result === 'added' ||
                        result === 'back' ||
                        result === 'no_folders' ||
                        result === 'no_workspace_root'
                      ) {
                        const current_items = quick_pick_files.items
                        let current_selected = quick_pick_files.selectedItems

                        if (result === 'added') {
                          const updated_checked =
                            workspace_provider.get_checked_files()
                          current_selected = current_items.filter(
                            (item: any) =>
                              (item.file_path &&
                                updated_checked.includes(item.file_path)) ||
                              current_selected.includes(item)
                          )
                        }

                        quick_pick_files.items = [...current_items]
                        quick_pick_files.selectedItems = current_selected
                        quick_pick_files.show()

                        setTimeout(() => {
                          quick_pick_files.activeItems = [e.item]
                        }, 0)
                      } else {
                        is_resolved = true
                        resolve(undefined)
                        quick_pick_files.dispose()
                      }
                    }
                  }),
                  quick_pick_files.onDidAccept(() => {
                    is_resolved = true
                    resolve(Array.from(quick_pick_files.selectedItems))
                    quick_pick_files.hide()
                  }),
                  quick_pick_files.onDidHide(() => {
                    if (is_showing_folder_quick_pick) return
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
                file_action = 'back'
                break // break inner loop
              }

              if (!selected_files) {
                return
              }

              let selected_paths: string[] = []

              if (selected_files === 'search') {
                const search_result = await search_files({
                  get_files: async () =>
                    valid_files.map((f) => f.absolute_path),
                  workspace_provider,
                  extension_context,
                  websocket_manager,
                  show_back_button: true
                })

                if (search_result === 'back') {
                  continue
                }

                if (!search_result) {
                  return
                }

                selected_paths = search_result.selected_paths
              } else {
                selected_paths = selected_files.map((item) => item.file_path)
              }

              if (selected_paths.length === 0) {
                file_action = 'finished'
                break
              }

              if (currently_checked.length > 0) {
                const selected_paths_set = new Set(selected_paths)
                const is_identical =
                  currently_checked.length === selected_paths_set.size &&
                  currently_checked.every((file) =>
                    selected_paths_set.has(file)
                  )

                if (is_identical) {
                  vscode.window.showInformationMessage(
                    t('common.info.context-already-set')
                  )
                  file_action = 'finished'
                  break
                }
              }

              const paths_to_apply = [
                ...new Set([...currently_checked, ...selected_paths])
              ]

              await workspace_provider.set_checked_files(paths_to_apply)

              vscode.window.showInformationMessage(
                dictionary.information_message.SELECTED_FILES(
                  paths_to_apply.length
                )
              )

              file_action = 'finished'
              break
            }

            if (file_action === 'back') {
              if (is_ahead_of_branch) {
                continue // go back to branch selection
              } else {
                break // go back to commit selection
              }
            }

            if (file_action === 'finished') {
              break // go back to commit selection
            }
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to load commit files: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'select_files_of_commit_command',
          message: 'Error handling files of commit command',
          data: error
        })
      }
    }
  )
}

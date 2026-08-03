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

export const select_commit_files_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectCommitFiles',
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
              t('command.select-commit-files.no-commits')
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

          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { hash: string }
          >()
          quick_pick.title = t('command.select-commit-files.title')
          quick_pick.items = commits
          quick_pick.placeholder = t('command.select-commit-files.select')
          quick_pick.matchOnDetail = true
          quick_pick.buttons = [
            { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
          ]

          if (last_selected_commit_hash) {
            const active_item = commits.find(
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

          const files_output = execSync(
            `git show --name-only --pretty="format:%B" ${selected_commit.hash}`,
            {
              cwd: repository.rootUri.fsPath,
              encoding: 'utf-8'
            }
          )
            .toString()
            .trim()

          if (!files_output) {
            vscode.window.showInformationMessage(
              t('command.select-commit-files.no-modified')
            )
            continue
          }

          const files = new Set<string>()

          const ascii_paths = AsciiTree.extract_paths(files_output)
          ascii_paths.forEach((p) => files.add(p))

          const lines = files_output.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.length > 0) {
              files.add(trimmed)
            }
          }

          const valid_files = Array.from(files)
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

          if (valid_files.length == 0) {
            vscode.window.showInformationMessage(
              t('command.select-commit-files.no-valid')
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
                const display_dir = dir_name == '.' ? '' : dir_name

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
              'command.select-commit-files.files-modified',
              {
                hash: selected_commit.hash.substring(0, 7)
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
              quick_pick_files.placeholder = `${t('command.select-commit-files.select-files')}${total_text}`
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

            if (selected_files == 'back') {
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
              if (selected_files.length == 0) {
                return
              }
              selected_paths = selected_files.map((item) => item.file_path)
            }

            if (selected_paths.length == 0) {
              return
            }

            if (currently_checked.length > 0) {
              const selected_paths_set = new Set(selected_paths)
              const is_identical =
                currently_checked.length == selected_paths_set.size &&
                currently_checked.every((file) => selected_paths_set.has(file))

              if (is_identical) {
                vscode.window.showInformationMessage(
                  dictionary.information_message.CONTEXT_ALREADY_SET
                )
                return
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
            return
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to load commit files: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'select_commit_files_command',
          message: 'Error handling commit files command',
          data: error
        })
      }
    }
  )
}

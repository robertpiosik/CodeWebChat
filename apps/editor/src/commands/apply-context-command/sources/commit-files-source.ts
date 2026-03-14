import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../../../constants/state-keys'
import { GIT_LOG_SINCE_DURATION } from '../../../constants/values'
import { get_git_repository } from '@/utils/git-repository-utils'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'
import { display_token_count } from '@/utils/display-token-count'

export const handle_commit_files_source = async (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<'back' | void> => {
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
          t('command.apply-context.commit.no-commits')
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
      quick_pick.title = t('command.apply-context.commit.title')
      quick_pick.items = commits
      quick_pick.placeholder = t('command.apply-context.commit.select')
      quick_pick.matchOnDetail = true
      quick_pick.buttons = [vscode.QuickInputButtons.Back]

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

      if (selected_commit == 'back') {
        return 'back'
      }

      if (!selected_commit) {
        return
      }

      last_selected_commit_hash = selected_commit.hash

      const files_output = execSync(
        `git show --name-only --pretty="" ${selected_commit.hash}`,
        {
          cwd: repository.rootUri.fsPath,
          encoding: 'utf-8'
        }
      )
        .toString()
        .trim()

      if (!files_output) {
        vscode.window.showInformationMessage(
          t('command.apply-context.commit.no-modified')
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

      if (valid_files.length == 0) {
        vscode.window.showInformationMessage(
          t('command.apply-context.commit.no-valid')
        )
        continue
      }

      // Inner loop for file selection
      while (true) {
        const currently_checked = workspace_provider.get_checked_files()
        const currently_checked_set = new Set(currently_checked)

        const file_items = await Promise.all(
          valid_files.map(async (f) => {
            const token_count = await workspace_provider.calculate_file_tokens(
              f.absolute_path
            )
            const formatted_token_count = display_token_count(token_count.total)
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

        const total_tokens = file_items.reduce(
          (acc, item) => acc + item.token_count,
          0
        )
        const formatted_total = display_token_count(total_tokens)

        const quick_pick_files = vscode.window.createQuickPick<any>()
        quick_pick_files.canSelectMany = true
        quick_pick_files.items = file_items
        quick_pick_files.selectedItems = file_items.filter((i) => i.picked)
        quick_pick_files.title = t(
          'command.apply-context.commit.files-modified',
          {
            hash: selected_commit.hash.substring(0, 7)
          }
        )
        quick_pick_files.placeholder = `${t('command.apply-context.commit.select-files')} (totalling ${formatted_total} tokens)`
        quick_pick_files.buttons = [vscode.QuickInputButtons.Back]
        quick_pick_files.ignoreFocusOut = true

        const selected_files = await new Promise<any[] | 'back' | undefined>(
          (resolve) => {
            let is_accepted = false
            let did_trigger_back = false
            const disposables: vscode.Disposable[] = []

            disposables.push(
              quick_pick_files.onDidTriggerButton((button) => {
                if (button === vscode.QuickInputButtons.Back) {
                  did_trigger_back = true
                  resolve('back')
                  quick_pick_files.hide()
                }
              }),
              quick_pick_files.onDidAccept(() => {
                is_accepted = true
                resolve(Array.from(quick_pick_files.selectedItems))
                quick_pick_files.hide()
              }),
              quick_pick_files.onDidHide(() => {
                if (!is_accepted && !did_trigger_back) {
                  resolve('back')
                }
                disposables.forEach((d) => d.dispose())
                quick_pick_files.dispose()
              })
            )

            quick_pick_files.show()
          }
        )

        if (selected_files == 'back') {
          break
        }

        if (!selected_files || selected_files.length == 0) {
          return
        }

        const selected_paths = selected_files.map((item) => item.file_path)
        let paths_to_apply = selected_paths
        let should_continue_file_loop = false

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

          if (!is_identical) {
            const quick_pick_options = [
              {
                label: t('command.apply-context.action.replace.label'),
                description: t(
                  'command.apply-context.action.replace.description'
                )
              },
              {
                label: t('command.apply-context.action.merge.label'),
                description: t('command.apply-context.action.merge.description')
              }
            ]

            const last_choice_label =
              extension_context.workspaceState.get<string>(
                LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
              )

            const quick_pick = vscode.window.createQuickPick()
            quick_pick.items = quick_pick_options
            quick_pick.placeholder = t('command.apply-context.commit.apply', {
              hash: selected_commit.hash.substring(0, 7)
            })
            quick_pick.buttons = [vscode.QuickInputButtons.Back]

            if (last_choice_label) {
              const active_item = quick_pick_options.find(
                (opt) => opt.label === last_choice_label
              )
              if (active_item) {
                quick_pick.activeItems = [active_item]
              }
            }

            const choice = await new Promise<
              vscode.QuickPickItem | 'back' | undefined
            >((resolve) => {
              let is_accepted = false
              quick_pick.onDidTriggerButton((button) => {
                if (button === vscode.QuickInputButtons.Back) {
                  resolve('back')
                  quick_pick.hide()
                }
              })
              quick_pick.onDidAccept(() => {
                is_accepted = true
                resolve(quick_pick.selectedItems[0])
                quick_pick.hide()
              })
              quick_pick.onDidHide(() => {
                if (!is_accepted) resolve('back')
                quick_pick.dispose()
              })
              quick_pick.show()
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

              if (
                choice.label == t('command.apply-context.action.merge.label')
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
          dictionary.information_message.SELECTED_FILES(paths_to_apply.length)
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
      function_name: 'handle_commit_files_source',
      message: 'Error handling commit files source',
      data: error
    })
  }
}

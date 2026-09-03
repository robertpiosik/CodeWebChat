import * as vscode from 'vscode'
import { execSync, exec } from 'child_process'
import { promisify } from 'util'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'
import { LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY } from '@/constants/state-keys'
import { display_token_count } from '@shared/utils/display-token-count'
import { build_changes_markdown } from '../../../utils/symbols/git/replace-git-symbols'

const execAsync = promisify(exec)

export const handle_changes_item = async (
  extension_context: vscode.ExtensionContext
): Promise<string | 'continue' | undefined> => {
  try {
    const workspace_folders = vscode.workspace.workspaceFolders
    if (!workspace_folders || workspace_folders.length == 0) {
      vscode.window.showErrorMessage(
        dictionary.error_message.NO_WORKSPACE_FOLDERS_FOUND
      )
      return undefined
    }

    const workspace_with_branches: Array<{
      folder: vscode.WorkspaceFolder
      branches: string[]
    }> = []

    let has_any_branches = false

    for (const folder of workspace_folders) {
      try {
        const branches_output = execSync('git branch --sort=-committerdate', {
          encoding: 'utf-8',
          cwd: folder.uri.fsPath
        })
          .toString()
          .trim()

        if (branches_output) {
          has_any_branches = true
        }

        const branches = branches_output
          .split('\n')
          .map((b) => b.replace(/^\*/, '').trim())
          .filter((b) => b.length > 0)

        if (branches.length > 0) {
          workspace_with_branches.push({ folder, branches })
        }
      } catch (error) {
        console.log(`Skipping ${folder.name}: not a Git repository`)
      }
    }

    if (!has_any_branches) {
      vscode.window.showInformationMessage(
        t('views.prompt.handlers.hash-sign.changes-symbol.no-branches')
      )
      return undefined
    }

    while (true) {
      let selected_workspace:
        | { folder: vscode.WorkspaceFolder; branches: string[] }
        | undefined

      if (workspace_with_branches.length == 1) {
        selected_workspace = workspace_with_branches[0]
      } else {
        const folder_items = workspace_with_branches.map((w) => ({
          label: w.folder.name
        }))
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = folder_items
        quick_pick.placeholder = 'Select a repository'
        quick_pick.title = 'Repositories'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const last_repo = extension_context.workspaceState.get<string>(
          LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY
        )
        if (last_repo) {
          const active = folder_items.find((item) => item.label === last_repo)
          if (active) quick_pick.activeItems = [active]
        }

        const picked_folder = await new Promise<
          vscode.QuickPickItem | 'back' | undefined
        >((resolve) => {
          let is_accepted = false
          let did_trigger_back = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                did_trigger_back = true
                quick_pick.hide()
                resolve('back')
              }
            }),
            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            }),
            quick_pick.onDidHide(() => {
              if (!is_accepted && !did_trigger_back) {
                resolve(undefined)
              }
              disposables.forEach((d) => d.dispose())
              quick_pick.dispose()
            })
          )
          quick_pick.show()
        })

        if (!picked_folder || picked_folder === 'back') return 'continue'

        await extension_context.workspaceState.update(
          LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY,
          picked_folder.label
        )

        selected_workspace = workspace_with_branches.find(
          (w) => w.folder.name === picked_folder.label
        )
      }

      if (!selected_workspace) {
        return 'continue'
      }

      if (selected_workspace.branches.length == 0) {
        vscode.window.showInformationMessage(
          t('views.prompt.handlers.hash-sign.changes-symbol.no-other-branches')
        )
        if (workspace_with_branches.length > 1) {
          continue
        }
        return 'continue'
      }

      let go_back_to_folders = false

      while (true) {
        const branch_items: vscode.QuickPickItem[] = selected_workspace.branches.map(
          (branch) => ({
            label: branch
          })
        )

        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = branch_items
        quick_pick.placeholder = 'Select branch to compare with'
        quick_pick.title = 'Branches'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const cwd = selected_workspace.folder.uri.fsPath
        const folder_name = selected_workspace.folder.name
        const is_multi_root = workspace_with_branches.length > 1

        let is_active = true

        const calculate_tokens = async () => {
          try {
            quick_pick.busy = true
            const current_branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd })
              .toString()
              .trim()

            for (let i = 0; i < branch_items.length; i++) {
              if (!is_active) break

              const branch = branch_items[i].label
              try {
                let diff_base: string
                if (current_branch === branch) {
                  const { stdout } = await execAsync(`git merge-base HEAD ${branch}`, { cwd })
                  diff_base = stdout.trim()
                } else {
                  diff_base = branch
                }

                const { stdout: diff } = await execAsync(`git diff ${diff_base}`, {
                  cwd,
                  maxBuffer: 1024 * 1024 * 100
                })

                if (!diff || diff.trim().length === 0) {
                  branch_items[i].description = 'No changes'
                } else {
                  const replacement_text = build_changes_markdown(
                    diff,
                    cwd,
                    diff_base,
                    branch,
                    is_multi_root ? folder_name : undefined
                  )
                  const token_count = Math.ceil(replacement_text.length / 4)
                  branch_items[i].description = display_token_count(token_count)
                }
              } catch (error) {
                branch_items[i].description = 'Failed to calculate'
              }

              if (is_active) {
                const active = quick_pick.activeItems
                quick_pick.items = [...branch_items]
                if (active.length > 0) {
                  const new_active = quick_pick.items.find(
                    (item) => item.label === active[0].label
                  )
                  if (new_active) {
                    quick_pick.activeItems = [new_active]
                  }
                }
              }
            }
          } catch (e) {
            // ignore
          } finally {
            if (is_active) {
              quick_pick.busy = false
            }
          }
        }

        calculate_tokens()

        const selected_branch = await new Promise<
          vscode.QuickPickItem | 'back' | undefined
        >((resolve) => {
          let is_accepted = false
          let did_trigger_back = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                did_trigger_back = true
                quick_pick.hide()
                resolve('back')
              }
            }),
            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            }),
            quick_pick.onDidHide(() => {
              if (!is_accepted && !did_trigger_back) {
                resolve(undefined)
              }
              disposables.forEach((d) => d.dispose())
              quick_pick.dispose()
            })
          )
          quick_pick.show()
        })

        is_active = false

        if (!selected_branch || selected_branch === 'back') {
          if (workspace_with_branches.length > 1) {
            go_back_to_folders = true
            break
          }
          return 'continue'
        }

        const formatted_branch =
          workspace_with_branches.length > 1
            ? `${selected_workspace.folder.name}/${selected_branch.label}`
            : selected_branch.label

        return `#Changes(${formatted_branch})`
      }

      if (go_back_to_folders) {
        continue
      }

      return 'continue'
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_GET_GIT_BRANCHES
    )
    return 'continue'
  }
}

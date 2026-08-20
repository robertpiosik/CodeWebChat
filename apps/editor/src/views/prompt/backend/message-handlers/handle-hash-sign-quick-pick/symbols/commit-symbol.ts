import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { dictionary } from '@shared/constants/dictionary'
import {
  LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY,
  LAST_SELECTED_COMMIT_REFERENCE_ACTION_STATE_KEY
} from '@/constants/state-keys'
import { GIT_LOG_SINCE_DURATION } from '@/constants/values'
import { t } from '@/i18n'

export const handle_commit_item = async (
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

    const git_folders: vscode.WorkspaceFolder[] = []
    for (const folder of workspace_folders) {
      try {
        execSync('git rev-parse --is-inside-work-tree', {
          cwd: folder.uri.fsPath,
          stdio: 'ignore'
        })
        git_folders.push(folder)
      } catch (error) {
        console.log(`Skipping ${folder.name}: not a Git repository`)
      }
    }

    if (git_folders.length == 0) {
      vscode.window.showErrorMessage(
        t('views.prompt.handlers.hash-sign.commit-symbol.no-git-repo')
      )
      return undefined
    }

    while (true) {
      let selected_folder: vscode.WorkspaceFolder | undefined

      if (git_folders.length == 1) {
        selected_folder = git_folders[0]
      } else {
        const folder_items = git_folders.map((folder) => ({
          label: folder.name
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

        if (!picked_folder || picked_folder == 'back') return 'continue'

        await extension_context.workspaceState.update(
          LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY,
          picked_folder.label
        )

        selected_folder = git_folders.find(
          (folder) => folder.name === picked_folder.label
        )
      }

      if (!selected_folder) {
        return 'continue'
      }

      const log_output = execSync(
        `git log --pretty=format:"%H%n%s%n%cr" --since="${GIT_LOG_SINCE_DURATION}"`,
        {
          encoding: 'utf-8',
          cwd: selected_folder.uri.fsPath
        }
      )

      if (!log_output.trim()) {
        vscode.window.showErrorMessage(
          t('views.prompt.handlers.hash-sign.commit-symbol.no-commits').replace(
            '{0}',
            selected_folder.name
          )
        )
        if (git_folders.length > 1) {
          continue
        }
        return 'continue'
      }

      const commits_raw = log_output.trim().split('\n')
      const commit_items: vscode.QuickPickItem[] = []
      for (let i = 0; i < commits_raw.length; i += 3) {
        const hash = commits_raw[i]
        const message = commits_raw[i + 1] || ''
        const date = commits_raw[i + 2] || ''
        if (hash) {
          commit_items.push({ label: hash, detail: message, description: date })
        }
      }

      let go_back_to_folders = false

      while (true) {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = commit_items
        quick_pick.placeholder = 'Select a commit to reference'
        quick_pick.title = 'Commits'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]
        quick_pick.matchOnDetail = true

        const selected_commit = await new Promise<
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

        if (!selected_commit || selected_commit == 'back') {
          if (git_folders.length > 1) {
            go_back_to_folders = true
            break
          }
          return 'continue'
        }

        const action_quick_pick = vscode.window.createQuickPick()
        const action_items = [
          {
            label: 'Diff with commit message'
          },
          {
            label: 'Commit message only'
          }
        ]
        action_quick_pick.items = action_items
        action_quick_pick.placeholder = 'Select what to include'
        action_quick_pick.title = 'Commit Reference Options'
        action_quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const last_action = extension_context.workspaceState.get<string>(
          LAST_SELECTED_COMMIT_REFERENCE_ACTION_STATE_KEY
        )
        if (last_action) {
          const active = action_items.find((item) => item.label === last_action)
          if (active) action_quick_pick.activeItems = [active]
        }

        const selected_action = await new Promise<
          vscode.QuickPickItem | 'back' | undefined
        >((resolve) => {
          let is_accepted = false
          let did_trigger_back = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            action_quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                did_trigger_back = true
                action_quick_pick.hide()
                resolve('back')
              }
            }),
            action_quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(action_quick_pick.selectedItems[0])
              action_quick_pick.hide()
            }),
            action_quick_pick.onDidHide(() => {
              if (!is_accepted && !did_trigger_back) {
                resolve(undefined)
              }
              disposables.forEach((d) => d.dispose())
              action_quick_pick.dispose()
            })
          )
          action_quick_pick.show()
        })

        if (selected_action == 'back') {
          continue
        }

        if (!selected_action) {
          return 'continue'
        }

        await extension_context.workspaceState.update(
          LAST_SELECTED_COMMIT_REFERENCE_ACTION_STATE_KEY,
          selected_action.label
        )

        const symbol =
          selected_action.label === 'Commit message only'
            ? 'CommitMessage'
            : 'Commit'
        const message = (selected_commit.detail || '').replace(/"/g, '\\"')
        return `#${symbol}(${selected_folder.name}:${selected_commit.label} "${message}")`
      }

      if (go_back_to_folders) {
        continue
      }

      return 'continue'
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      t('views.prompt.handlers.hash-sign.commit-symbol.failed-to-get-commits')
    )
    return 'continue'
  }
}

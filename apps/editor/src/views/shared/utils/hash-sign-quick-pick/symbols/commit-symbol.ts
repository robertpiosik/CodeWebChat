import * as vscode from 'vscode'
import { execFileSync } from 'child_process'
import {
  LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY,
  LAST_SELECTED_COMMIT_REFERENCE_ACTION_STATE_KEY
} from '@/constants/state-keys'
import { GIT_LOG_SINCE_DURATION } from '@/constants/values'
import { t } from '@/i18n'
import { display_token_count } from '@shared/utils/display-token-count'
import { AsciiTree } from '@/utils/ascii-tree/ascii-tree'
import { build_commit_changes_markdown } from '@/views/prompt/backend/utils/symbols/git/replace-git-symbols'

const get_commit_remote_url = (
  remote_url: string,
  hash: string
): string | undefined => {
  if (!remote_url) return undefined

  let web_url = remote_url

  if (web_url.startsWith('git@')) {
    const match = web_url.match(/git@([^:]+):(.+)/)
    if (match) {
      web_url = `https://${match[1]}/${match[2]}`
    }
  } else if (web_url.startsWith('ssh://')) {
    const match = web_url.match(/ssh:\/\/(?:[^@]+@)?([^/:]+)(?::\d+)?\/(.+)/)
    if (match) {
      web_url = `https://${match[1]}/${match[2]}`
    }
  }

  if (web_url.endsWith('.git')) {
    web_url = web_url.slice(0, -4)
  }

  if (web_url.includes('bitbucket.org')) {
    return `${web_url}/commits/${hash}`
  }
  if (web_url.includes('gitlab.com') || web_url.includes('gitlab.')) {
    return `${web_url}/-/commit/${hash}`
  }
  return `${web_url}/commit/${hash}`
}

export const handle_commit_item = async (
  extension_context: vscode.ExtensionContext,
  on_insert: (text: string) => void
): Promise<'continue' | undefined> => {
  try {
    const close_button = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }

    const workspace_folders = vscode.workspace.workspaceFolders
    if (!workspace_folders || workspace_folders.length === 0) {
      vscode.window.showWarningMessage(
        t('common.warning.no-workspace-folders-found')
      )
      return undefined
    }

    const git_folders: vscode.WorkspaceFolder[] = []
    for (const folder of workspace_folders) {
      try {
        execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
          cwd: folder.uri.fsPath,
          stdio: 'ignore'
        })
        git_folders.push(folder)
      } catch {
        console.log(`Skipping ${folder.name}: not a Git repository`)
      }
    }

    if (git_folders.length === 0) {
      vscode.window.showWarningMessage(
        t('common.warning.no-git-repository-found')
      )
      return undefined
    }

    while (true) {
      let selected_folder: vscode.WorkspaceFolder | undefined

      if (git_folders.length === 1) {
        selected_folder = git_folders[0]
      } else {
        const folder_items = git_folders.map((folder) => ({
          label: folder.name
        }))
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = folder_items
        quick_pick.placeholder = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.select-repository'
        )
        quick_pick.title = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.repositories'
        )
        quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
        quick_pick.ignoreFocusOut = true

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
              } else if (button === close_button) {
                quick_pick.hide()
                resolve(undefined)
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

        if (picked_folder === 'back') return 'continue'
        if (!picked_folder) return undefined

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

      const log_output = execFileSync(
        'git',
        [
          'log',
          '--pretty=format:%H%n%s%n%cr',
          `--since=${GIT_LOG_SINCE_DURATION}`
        ],
        {
          encoding: 'utf-8',
          cwd: selected_folder.uri.fsPath
        }
      )

      if (!log_output.trim()) {
        vscode.window.showErrorMessage(
          t(
            'views.shared.utils.hash-sign-quick-pick.commit-symbol.no-commits'
          ).replace('{0}', selected_folder.name)
        )
        if (git_folders.length > 1) {
          continue
        }
        return 'continue'
      }

      let remote_url: string | undefined
      try {
        remote_url = execFileSync(
          'git',
          ['config', '--get', 'remote.origin.url'],
          { cwd: selected_folder.uri.fsPath, encoding: 'utf-8' }
        ).trim()
      } catch {
        // ignore
      }

      const commits_raw = log_output.trim().split('\n')
      const commit_items: vscode.QuickPickItem[] = []
      for (let i = 0; i < commits_raw.length; i += 3) {
        const hash = commits_raw[i]
        const message = commits_raw[i + 1] || ''
        const date = commits_raw[i + 2] || ''
        if (hash) {
          const item: vscode.QuickPickItem = {
            label: hash,
            detail: message,
            description: date
          }
          if (remote_url) {
            item.buttons = [
              {
                iconPath: new vscode.ThemeIcon('globe'),
                tooltip: t(
                  'views.shared.utils.hash-sign-quick-pick.commit-symbol.open-on-remote'
                )
              }
            ]
          }
          commit_items.push(item)
        }
      }

      let go_back_to_folders = false
      let last_selected_commit: vscode.QuickPickItem | undefined

      while (true) {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = commit_items
        quick_pick.placeholder = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.select-commit'
        )
        quick_pick.title = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.commits'
        )
        quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
        quick_pick.ignoreFocusOut = true
        quick_pick.matchOnDetail = true

        if (last_selected_commit) {
          const active = commit_items.find(
            (item) => item.label === last_selected_commit?.label
          )
          if (active) {
            quick_pick.activeItems = [active]
          }
        }

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
              } else if (button === close_button) {
                quick_pick.hide()
                resolve(undefined)
              }
            }),
            quick_pick.onDidTriggerItemButton(async (e) => {
              quick_pick.activeItems = [e.item]
              if (
                e.button.iconPath instanceof vscode.ThemeIcon &&
                e.button.iconPath.id === 'globe' &&
                remote_url
              ) {
                const url = get_commit_remote_url(remote_url, e.item.label)
                if (url) {
                  await vscode.env.openExternal(vscode.Uri.parse(url))
                }
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

        if (!selected_commit) {
          return undefined
        }
        if (selected_commit === 'back') {
          if (git_folders.length > 1) {
            go_back_to_folders = true
            break
          }
          return 'continue'
        }

        last_selected_commit = selected_commit
        const commit_hash = selected_commit.label
        let diff_token_count = 0
        let diff_only_token_count = 0
        let msg_token_count = 0

        try {
          let commit_message = ''
          const raw_msg = execFileSync(
            'git',
            ['show', '-s', '--format=%B', commit_hash],
            {
              cwd: selected_folder.uri.fsPath,
              encoding: 'utf-8'
            }
          ).toString()
          commit_message = AsciiTree.strip_from_text(raw_msg)

          if (commit_message) {
            msg_token_count = Math.ceil(
              `---\n\n${commit_message}\n\n---\n\n`.length / 4
            )
          }

          const diff = execFileSync('git', ['show', commit_hash], {
            cwd: selected_folder.uri.fsPath,
            encoding: 'utf-8'
          }).toString()

          const replacement_text_with_msg = build_commit_changes_markdown({
            diff,
            commit_hash,
            path_prefix:
              workspace_folders.length > 1 ? selected_folder.name : undefined,
            commit_message
          })
          diff_token_count = Math.ceil(replacement_text_with_msg.length / 4)

          const replacement_text_only_diff = build_commit_changes_markdown({
            diff,
            commit_hash,
            path_prefix:
              workspace_folders.length > 1 ? selected_folder.name : undefined
          })
          diff_only_token_count = Math.ceil(
            replacement_text_only_diff.length / 4
          )
        } catch {
          // ignore
        }

        const action_quick_pick = vscode.window.createQuickPick()
        const diff_with_message_label = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.diff-with-message'
        )
        const message_only_label = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.message-only'
        )
        const diff_only_label = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.diff-only'
        )

        const action_items = [
          {
            label: diff_with_message_label,
            description:
              diff_token_count > 0
                ? display_token_count(diff_token_count)
                : undefined
          },
          {
            label: message_only_label,
            description:
              msg_token_count > 0
                ? display_token_count(msg_token_count)
                : undefined
          },
          {
            label: diff_only_label,
            description:
              diff_only_token_count > 0
                ? display_token_count(diff_only_token_count)
                : undefined
          }
        ]
        action_quick_pick.items = action_items
        action_quick_pick.placeholder = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.select-what-to-include'
        )
        action_quick_pick.title = t(
          'views.shared.utils.hash-sign-quick-pick.commit-symbol.options'
        )
        action_quick_pick.buttons = [
          vscode.QuickInputButtons.Back,
          close_button
        ]
        action_quick_pick.ignoreFocusOut = true

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
              } else if (button === close_button) {
                action_quick_pick.hide()
                resolve(undefined)
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

        if (!selected_action) {
          return undefined
        }
        if (selected_action === 'back') {
          continue
        }

        await extension_context.workspaceState.update(
          LAST_SELECTED_COMMIT_REFERENCE_ACTION_STATE_KEY,
          selected_action.label
        )

        const symbol =
          selected_action.label === message_only_label
            ? 'CommitMessage'
            : selected_action.label === diff_only_label
              ? 'CommitDiff'
              : 'Commit'
        const message = (selected_commit.detail || '').replace(/"/g, '\\"')

        on_insert(
          `#${symbol}(${selected_folder.name}:${selected_commit.label} "${message}") `
        )

        const add_another_label = t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.commit.add-another'
        )
        const action = await vscode.window.showInformationMessage(
          t(
            'views.shared.utils.hash-sign-quick-pick.quick-pick.commit.inserted'
          ),
          add_another_label
        )

        if (action === add_another_label) {
          continue
        }

        return undefined
      }

      if (go_back_to_folders) {
        continue
      }

      return 'continue'
    }
  } catch {
    vscode.window.showErrorMessage(
      t(
        'views.shared.utils.hash-sign-quick-pick.commit-symbol.failed-to-get-commits'
      )
    )
    return 'continue'
  }
}

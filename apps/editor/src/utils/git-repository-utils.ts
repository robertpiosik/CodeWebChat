import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { dictionary } from '@shared/constants/dictionary'
import * as path from 'path'
import { t } from '@/i18n'
import { MAX_FILE_TOKENS_FOR_COMMIT_MESSAGE } from '@/constants/values'
import { PromptBuilder } from './prompt-builder'
import { display_token_count } from '@shared/utils/display-token-count'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { WebSocketManager } from '@/services/websocket-manager'
import { search_files } from '@/features/search-files'

export type GitRepository = {
  rootUri: vscode.Uri
  state: {
    indexChanges: any[]
    workingTreeChanges: any[]
  }
  add: (files: string[]) => Promise<void>
  status: () => Promise<void>
  inputBox: {
    value: string
  }
  show: (ref: string, path: string) => Promise<string>
}

const get_all_git_repositories = (): GitRepository[] | null => {
  const git_extension = vscode.extensions.getExtension('vscode.git')
  if (!git_extension) {
    vscode.window.showErrorMessage(t('common.error.git-integration-missing'))
    return null
  }

  const git_api = git_extension.exports.getAPI(1)
  const repositories: GitRepository[] = git_api.repositories

  if (!repositories || repositories.length == 0) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_GIT_REPOSITORY_FOUND
    )
    return null
  }

  return repositories
}

export const get_git_repository = async (
  source_control?: vscode.SourceControl
): Promise<GitRepository | null> => {
  const repositories = get_all_git_repositories()
  if (!repositories) return null

  if (source_control?.rootUri) {
    const repository = repositories.find(
      (repo) => repo.rootUri.toString() === source_control.rootUri!.toString()
    )
    if (repository) {
      return repository
    }
  }

  if (repositories.length == 1) {
    return repositories[0]
  }

  const picks = repositories.map((repo) => {
    const folder = vscode.workspace.getWorkspaceFolder(repo.rootUri)
    return {
      label: folder ? folder.name : path.basename(repo.rootUri.fsPath),
      description: repo.rootUri.fsPath,
      repository: repo
    }
  })

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { repository: GitRepository }
  >()
  quick_pick.title = 'Workspaces'
  quick_pick.placeholder = t(
    'command.generate-commit-message.select-repository'
  )
  quick_pick.items = picks
  quick_pick.buttons = [
    { iconPath: new vscode.ThemeIcon('close'), tooltip: t('common.close') }
  ]

  const selected = await new Promise<
    (vscode.QuickPickItem & { repository: GitRepository }) | undefined
  >((resolve) => {
    let is_accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      quick_pick.onDidTriggerButton(() => {
        resolve(undefined)
        quick_pick.hide()
      }),
      quick_pick.onDidAccept(() => {
        is_accepted = true
        resolve(quick_pick.selectedItems[0])
        quick_pick.hide()
      }),
      quick_pick.onDidHide(() => {
        if (!is_accepted) {
          resolve(undefined)
        }
        disposables.forEach((d) => d.dispose())
        quick_pick.dispose()
      })
    )
    quick_pick.show()
  })

  if (!selected) {
    return null
  }

  return selected.repository
}

export const get_repository_for_commit = async (
  source_control?: vscode.SourceControl
): Promise<GitRepository | null> => {
  const repositories = get_all_git_repositories()
  if (!repositories) return null

  if (source_control?.rootUri) {
    const repository = repositories.find(
      (repo) => repo.rootUri.toString() === source_control.rootUri!.toString()
    )
    if (repository) {
      return repository
    }
  }

  if (repositories.length == 1) {
    return repositories[0]
  }

  const repositories_with_changes = repositories.filter(
    (repo) =>
      repo.state.indexChanges.length > 0 ||
      repo.state.workingTreeChanges.length > 0
  )

  if (repositories_with_changes.length == 0) {
    vscode.window.showInformationMessage(
      t('utils.git-repository-utils.nothing-to-commit')
    )
    return null
  }

  if (repositories_with_changes.length == 1) {
    return repositories_with_changes[0]
  }

  const picks = repositories_with_changes.map((repo) => {
    const folder = vscode.workspace.getWorkspaceFolder(repo.rootUri)
    return {
      label: folder ? folder.name : path.basename(repo.rootUri.fsPath),
      description: repo.rootUri.fsPath,
      repository: repo
    }
  })

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { repository: GitRepository }
  >()
  quick_pick.title = 'Workspaces'
  quick_pick.placeholder = t(
    'command.generate-commit-message.select-repository'
  )
  quick_pick.items = picks
  quick_pick.buttons = [
    { iconPath: new vscode.ThemeIcon('close'), tooltip: t('common.close') }
  ]

  const selected = await new Promise<
    (vscode.QuickPickItem & { repository: GitRepository }) | undefined
  >((resolve) => {
    let is_accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      quick_pick.onDidTriggerButton(() => {
        resolve(undefined)
        quick_pick.hide()
      }),
      quick_pick.onDidAccept(() => {
        is_accepted = true
        resolve(quick_pick.selectedItems[0])
        quick_pick.hide()
      }),
      quick_pick.onDidHide(() => {
        if (!is_accepted) {
          resolve(undefined)
        }
        disposables.forEach((d) => d.dispose())
        quick_pick.dispose()
      })
    )
    quick_pick.show()
  })

  if (!selected) {
    return null
  }

  return selected.repository
}

export const prepare_staged_changes = async (params: {
  repository: GitRepository
  stage_all_if_none_staged?: boolean
  selection_state?: { files?: string[] }
  workspace_provider?: WorkspaceProvider
  extension_context?: vscode.ExtensionContext
  websocket_manager?: WebSocketManager
}): Promise<string | null> => {
  await params.repository.status()
  const staged_changes = params.repository.state.indexChanges || []

  if (
    staged_changes.length == 0 &&
    params.repository.state.workingTreeChanges.length > 0
  ) {
    let files_to_stage: string[] = []

    if (params.stage_all_if_none_staged) {
      files_to_stage = params.repository.state.workingTreeChanges.map(
        (change: any) => change.uri.fsPath
      )
    } else if (params.repository.state.workingTreeChanges.length == 1) {
      files_to_stage = [
        params.repository.state.workingTreeChanges[0].uri.fsPath
      ]
    } else {
      const items = await Promise.all(
        params.repository.state.workingTreeChanges.map(async (change: any) => {
          const relative_path = path.relative(
            params.repository.rootUri.fsPath,
            change.uri.fsPath
          )
          const dir_name = path.dirname(relative_path)

          let status: 'created' | 'deleted' | 'renamed' | 'updated' = 'updated'
          let is_deleted = false
          let final_diff_content = ''
          let full_content = ''

          try {
            if (change.status == 7) {
              // UNTRACKED
              status = 'created'
              const content = await vscode.workspace.fs.readFile(change.uri)
              if (content.includes(0)) {
                final_diff_content = 'Binary file added'
              } else {
                full_content = Buffer.from(content).toString('utf8')
                const lines = full_content.split('\n')
                final_diff_content =
                  `@@ -0,0 +1,${lines.length} @@\n` +
                  lines.map((l: string) => '+' + l).join('\n')
              }
            } else {
              const raw_diff = execSync(`git diff -- "${change.uri.fsPath}"`, {
                cwd: params.repository.rootUri.fsPath
              }).toString()

              if (
                raw_diff.includes('\n+++ /dev/null') ||
                raw_diff.startsWith('+++ /dev/null')
              ) {
                status = 'deleted'
                is_deleted = true
              } else {
                if (
                  raw_diff.includes('\nnew file mode ') ||
                  raw_diff.startsWith('new file mode ')
                ) {
                  status = 'created'
                }

                if (
                  raw_diff.includes('\nBinary files ') ||
                  raw_diff.startsWith('Binary files ')
                ) {
                  final_diff_content = 'Binary file modified'
                } else {
                  const hunk_start_index = raw_diff.indexOf('\n@@ ')
                  if (hunk_start_index !== -1) {
                    final_diff_content = raw_diff.substring(
                      hunk_start_index + 1
                    )
                  } else if (raw_diff.startsWith('@@ ')) {
                    final_diff_content = raw_diff
                  }

                  try {
                    const content = await vscode.workspace.fs.readFile(
                      change.uri
                    )
                    if (!content.includes(0)) {
                      full_content = Buffer.from(content).toString('utf8')
                    }
                  } catch (e) {}
                }
              }
            }
          } catch (e) {}

          const file_tokens = Math.ceil(
            (full_content ? full_content.length : final_diff_content.length) / 4
          )
          const is_too_large = file_tokens > MAX_FILE_TOKENS_FOR_COMMIT_MESSAGE

          const file_md = PromptBuilder.build_diff_file_context({
            status,
            filepath: relative_path,
            diff_content: final_diff_content,
            full_content:
              !is_deleted && full_content && !is_too_large
                ? full_content
                : undefined
          })

          const token_count = Math.ceil(file_md.length / 4)
          const description_parts = []

          if (!is_too_large) {
            const tokens_str = display_token_count(token_count)
            description_parts.push(tokens_str)
          }
          if (dir_name != '.') description_parts.push(dir_name)

          return {
            label: path.basename(relative_path),
            description: description_parts.join(' · '),
            picked: true,
            fsPath: change.uri.fsPath,
            token_count,
            buttons: [
              {
                iconPath: new vscode.ThemeIcon(
                  'git-pull-request-go-to-changes'
                ),
                tooltip: t('command.generate-commit-message.show-diff')
              },
              {
                iconPath: new vscode.ThemeIcon('go-to-file'),
                tooltip: t('common.go-to-file')
              }
            ]
          }
        })
      )

      let current_selected_fs_paths = params.selection_state?.files || items.map((i) => i.fsPath)

      while (true) {
        const selected = await new Promise<any[] | undefined | 'search'>((resolve) => {
          const quick_pick = vscode.window.createQuickPick<any>()
          quick_pick.items = items
          quick_pick.selectedItems = items.filter((i) => current_selected_fs_paths.includes(i.fsPath))

          quick_pick.canSelectMany = true
          quick_pick.matchOnDescription = true
          quick_pick.title = t('command.generate-commit-message.unstaged-files')
          quick_pick.placeholder = t('command.generate-commit-message.select-files')
          quick_pick.ignoreFocusOut = true

          const close_button = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
          const search_button = {
            iconPath: new vscode.ThemeIcon('search'),
            tooltip: t('common.search-in-selected-results')
          }

          quick_pick.buttons = params.workspace_provider && params.extension_context && params.websocket_manager
            ? [search_button, close_button]
            : [close_button]

          quick_pick.onDidTriggerButton((button) => {
            if (button.tooltip == t('common.close')) {
              resolve(undefined)
              quick_pick.hide()
            } else if (button.tooltip == t('common.search-in-selected-results')) {
              current_selected_fs_paths = Array.from(quick_pick.selectedItems).map((i: any) => i.fsPath)
              if (current_selected_fs_paths.length == 0) {
                vscode.window.showInformationMessage(t('common.info.select-files-to-search'))
                return
              }
              resolve('search')
              quick_pick.hide()
            }
          })

          quick_pick.onDidTriggerItemButton(async (event) => {
            if (event.button.tooltip == t('common.go-to-file')) {
              const uri = vscode.Uri.file(event.item.fsPath)
              vscode.window.showTextDocument(uri, { preview: true })
            } else if (event.button.tooltip == t('command.generate-commit-message.show-diff')) {
              const uri = vscode.Uri.file(event.item.fsPath)
              await vscode.commands.executeCommand('git.openChange', uri)
            }
          })

          quick_pick.onDidAccept(() => {
            const selected_items = Array.from(quick_pick.selectedItems)
            current_selected_fs_paths = selected_items.map((i: any) => i.fsPath)
            resolve(selected_items)
            quick_pick.hide()
          })

          quick_pick.onDidHide(() => {
            resolve(undefined)
            quick_pick.dispose()
          })

          quick_pick.show()
        })

        if (!selected) {
          return null
        }

        if (selected === 'search') {
          if (!params.workspace_provider || !params.extension_context || !params.websocket_manager) {
            continue
          }

          const search_result = await search_files({
            get_files: async () => current_selected_fs_paths,
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context,
            websocket_manager: params.websocket_manager,
            show_back_button: true
          })

          if (search_result === 'back') {
            continue
          }

          if (!search_result || search_result.selected_paths.length === 0) {
            return null
          }

          files_to_stage = search_result.selected_paths
          if (params.selection_state) {
            params.selection_state.files = files_to_stage
          }
          break
        } else {
          if (selected.length === 0) {
            return null
          }
          files_to_stage = selected.map((item) => item.fsPath)
          if (params.selection_state) {
            params.selection_state.files = files_to_stage
          }
          break
        }
      }
    }

    const file_args = files_to_stage
      .map((file: string) => `"${file.replace(/"/g, '\\"')}"`)
      .join(' ')
    execSync(`git add -- ${file_args}`, {
      cwd: params.repository.rootUri.fsPath
    })
    await params.repository.status()
  }

  const diff = execSync('git diff --staged', {
    cwd: params.repository.rootUri.fsPath
  }).toString()

  if (!diff || diff.length == 0) {
    vscode.window.showInformationMessage(
      t('utils.git-repository-utils.nothing-to-commit')
    )
    return null
  }

  return diff
}

import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { dictionary } from '@shared/constants/dictionary'
import * as path from 'path'
import { t } from '@/i18n'
import { display_token_count } from './display-token-count'
import { MAX_FILE_TOKENS_FOR_COMMIT_MESSAGE } from '@/constants/values'

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

export const get_git_repository = async (
  source_control?: vscode.SourceControl
): Promise<GitRepository | null> => {
  const git_extension = vscode.extensions.getExtension('vscode.git')
  if (!git_extension) {
    vscode.window.showErrorMessage(
      dictionary.error_message.GIT_EXTENSION_NOT_FOUND
    )
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
      dictionary.information_message.NO_CHANGES_TO_COMMIT
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

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: t('command.commit-message.select-repository')
  })

  if (!selected) {
    return null
  }

  return selected.repository
}

export const prepare_staged_changes = async (
  repository: GitRepository,
  stage_all_if_none_staged: boolean = false,
  selection_state?: { files?: string[] }
): Promise<string | null> => {
  await repository.status()
  const staged_changes = repository.state.indexChanges || []

  if (
    staged_changes.length == 0 &&
    repository.state.workingTreeChanges.length > 0
  ) {
    let files_to_stage: string[] = []

    if (stage_all_if_none_staged) {
      files_to_stage = repository.state.workingTreeChanges.map(
        (change: any) => change.uri.fsPath
      )
    } else if (repository.state.workingTreeChanges.length == 1) {
      files_to_stage = [repository.state.workingTreeChanges[0].uri.fsPath]
    } else {
      const items = await Promise.all(
        repository.state.workingTreeChanges.map(async (change: any) => {
          const relative_path = path.relative(
            repository.rootUri.fsPath,
            change.uri.fsPath
          )
          const dir_name = path.dirname(relative_path)

          let status = 'updated'
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
                cwd: repository.rootUri.fsPath
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

          let file_xml = `<file path="${relative_path}" status="${status}">\n`
          file_xml += `<![CDATA[\n${final_diff_content.trimEnd()}\n]]>\n`
          if (!is_deleted && full_content && !is_too_large) {
            file_xml += `<![CDATA[\n${full_content.trimEnd()}\n]]>\n`
          }
          file_xml += `</file>\n`

          const token_count = Math.ceil(file_xml.length / 4)
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
                tooltip: t('command.commit-message.show-diff')
              },
              {
                iconPath: new vscode.ThemeIcon('go-to-file'),
                tooltip: t('common.go-to-file')
              }
            ]
          }
        })
      )

      const selected = await new Promise<any[] | undefined>((resolve) => {
        const quick_pick = vscode.window.createQuickPick<any>()
        quick_pick.items = items

        if (selection_state?.files) {
          quick_pick.selectedItems = items.filter((i) =>
            selection_state.files!.includes(i.fsPath)
          )
        } else {
          quick_pick.selectedItems = items
        }

        quick_pick.canSelectMany = true
        quick_pick.title = t('command.commit-message.unstaged-files')
        quick_pick.placeholder = t('command.commit-message.select-files')
        quick_pick.ignoreFocusOut = true
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
        ]

        quick_pick.onDidTriggerButton((button) => {
          if (button.tooltip == t('common.close')) {
            resolve(undefined)
            quick_pick.hide()
          }
        })

        quick_pick.onDidTriggerItemButton(async (event) => {
          if (event.button.tooltip == t('common.go-to-file')) {
            const uri = vscode.Uri.file(event.item.fsPath)
            vscode.window.showTextDocument(uri, { preview: true })
          } else if (
            event.button.tooltip == t('command.commit-message.show-diff')
          ) {
            const uri = vscode.Uri.file(event.item.fsPath)
            await vscode.commands.executeCommand('git.openChange', uri)
          }
        })

        quick_pick.onDidAccept(() => {
          const selected_items = Array.from(quick_pick.selectedItems)
          if (selection_state) {
            selection_state.files = selected_items.map((i: any) => i.fsPath)
          }
          resolve(selected_items)
          quick_pick.hide()
        })

        quick_pick.onDidHide(() => {
          resolve(undefined)
          quick_pick.dispose()
        })

        quick_pick.show()
      })

      if (!selected || selected.length == 0) {
        return null
      }

      files_to_stage = selected.map((item) => item.fsPath)
    }

    const file_args = files_to_stage
      .map((file: string) => `"${file.replace(/"/g, '\\"')}"`)
      .join(' ')
    execSync(`git add -- ${file_args}`, {
      cwd: repository.rootUri.fsPath
    })
    await repository.status()
  }

  const diff = execSync('git diff --staged', {
    cwd: repository.rootUri.fsPath
  }).toString()

  if (!diff || diff.length == 0) {
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CHANGES_TO_COMMIT
    )
    return null
  }

  return diff
}

import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { dictionary } from '@shared/constants/dictionary'
import * as path from 'path'

type GitRepository = {
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

  const repositories_to_show =
    repositories_with_changes.length > 0
      ? repositories_with_changes
      : repositories

  if (repositories_to_show.length == 1) {
    return repositories_to_show[0]
  }

  const picks = repositories_to_show.map((repo) => {
    const folder = vscode.workspace.getWorkspaceFolder(repo.rootUri)
    return {
      label: folder ? folder.name : path.basename(repo.rootUri.fsPath),
      description: repo.rootUri.fsPath,
      repository: repo
    }
  })

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Select a repository to generate the commit message for'
  })

  if (!selected) {
    return null
  }

  return selected.repository
}

export const prepare_staged_changes = async (
  repository: GitRepository,
  stage_all_if_none_staged: boolean = false
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
      const items = repository.state.workingTreeChanges.map((change: any) => {
        const relative_path = path.relative(
          repository.rootUri.fsPath,
          change.uri.fsPath
        )
        const dir_name = path.dirname(relative_path)

        return {
          label: path.basename(relative_path),
          description: dir_name == '.' ? '' : dir_name,
          picked: true,
          fsPath: change.uri.fsPath
        }
      })

      const selected = await new Promise<any[] | undefined>((resolve) => {
        const quick_pick = vscode.window.createQuickPick<any>()
        quick_pick.items = items
        quick_pick.selectedItems = items
        quick_pick.canSelectMany = true
        quick_pick.title = 'Unstaged Files'
        quick_pick.placeholder = 'Select files to commit'
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: 'Close'
          }
        ]

        quick_pick.onDidTriggerButton((button) => {
          if (button.tooltip == 'Close') {
            resolve(undefined)
            quick_pick.hide()
          }
        })

        quick_pick.onDidAccept(() => {
          resolve(Array.from(quick_pick.selectedItems))
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

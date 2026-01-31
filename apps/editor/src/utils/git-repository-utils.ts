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
  repository: GitRepository
): Promise<string | null> => {
  await repository.status()
  const staged_changes = repository.state.indexChanges || []

  if (
    staged_changes.length == 0 &&
    repository.state.workingTreeChanges.length > 0
  ) {
    const files_to_stage = repository.state.workingTreeChanges.map(
      (change: any) => change.uri.fsPath
    )
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

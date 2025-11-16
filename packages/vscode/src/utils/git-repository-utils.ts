import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { dictionary } from '@shared/constants/dictionary'

export interface GitRepository {
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
}

export function get_git_repository(
  source_control?: vscode.SourceControl
): GitRepository | null {
  const git_extension = vscode.extensions.getExtension('vscode.git')
  if (!git_extension) {
    vscode.window.showErrorMessage(
      dictionary.error_message.GIT_EXTENSION_NOT_FOUND
    )
    return null
  }

  const git_api = git_extension.exports.getAPI(1)
  const repositories = git_api.repositories

  if (!repositories || repositories.length === 0) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_GIT_REPOSITORY_FOUND
    )
    return null
  }

  let repository

  // If source_control is provided and has rootUri, find matching repository
  if (source_control?.rootUri) {
    repository = repositories.find(
      (repo: any) =>
        repo.rootUri.toString() === source_control.rootUri!.toString()
    )
  }

  // If no repository found or source_control not provided, use first repository
  if (!repository) {
    repository = repositories[0]
    if (!repository) {
      vscode.window.showErrorMessage(
        dictionary.error_message.REPOSITORY_NOT_FOUND
      )
      return null
    }
  }

  return repository
}

export async function prepare_staged_changes(
  repository: GitRepository
): Promise<string | null> {
  await repository.status()
  const staged_changes = repository.state.indexChanges || []

  if (
    staged_changes.length === 0 &&
    repository.state.workingTreeChanges.length > 0
  ) {
    const uris_to_stage = repository.state.workingTreeChanges.map(
      (change: any) => change.uri.fsPath
    )
    await repository.add(uris_to_stage)
    await new Promise((resolve) => setTimeout(resolve, 500))
    await repository.status()
  }

  const diff = execSync('git diff --staged', {
    cwd: repository.rootUri.fsPath
  }).toString()

  if (!diff || diff.length === 0) {
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CHANGES_TO_COMMIT
    )
    return null
  }

  return diff
}

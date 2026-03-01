import * as vscode from 'vscode'
import * as path from 'path'
import { PromptsForCommitMessagesUtils } from '../utils/prompts-for-commit-messages-utils'

export const setup_git_discard_file_watcher = (
  context: vscode.ExtensionContext
) => {
  const git_extension = vscode.extensions.getExtension('vscode.git')
  if (!git_extension) return

  const init = async () => {
    try {
      if (!git_extension.isActive) {
        await git_extension.activate()
      }
      const git_api = git_extension.exports.getAPI(1)

      const repo_states = new Map<string, Set<string>>()

      const update_repo_state = (repo: any) => {
        const workspace_root = repo.rootUri.fsPath
        const current_changes = new Set<string>()

        const all_changes = [
          ...(repo.state.indexChanges || []),
          ...(repo.state.workingTreeChanges || []),
          ...(repo.state.mergeChanges || [])
        ]

        for (const change of all_changes) {
          if (change.uri) {
            const relative_path = path
              .relative(workspace_root, change.uri.fsPath)
              .replace(/\\/g, '/')
            current_changes.add(relative_path)
          }
        }

        const previous_changes = repo_states.get(workspace_root)

        if (previous_changes) {
          for (const prev_change of previous_changes) {
            if (!current_changes.has(prev_change)) {
              PromptsForCommitMessagesUtils.remove_file_path({
                context,
                file_path: prev_change,
                workspace_root
              })
            }
          }
        }

        repo_states.set(workspace_root, current_changes)
      }

      for (const repo of git_api.repositories) {
        update_repo_state(repo)
        context.subscriptions.push(
          repo.state.onDidChange(() => update_repo_state(repo))
        )
      }

      context.subscriptions.push(
        git_api.onDidOpenRepository((repo: any) => {
          update_repo_state(repo)
          context.subscriptions.push(
            repo.state.onDidChange(() => update_repo_state(repo))
          )
        })
      )
    } catch (error) {
      console.error('Failed to initialize git state watcher:', error)
    }
  }

  init()
}

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { display_token_count } from '../../../utils/display-token-count'

export async function handle_unstaged_files_source(
  workspace_provider: WorkspaceProvider
): Promise<void> {
  try {
    const git_extension = vscode.extensions.getExtension('vscode.git')?.exports
    if (!git_extension) {
      vscode.window.showErrorMessage('Git extension is not available.')
      return
    }
    const git_api = git_extension.getAPI(1)
    if (!git_api) {
      vscode.window.showErrorMessage('Could not get Git API.')
      return
    }

    if (git_api.repositories.length === 0) {
      vscode.window.showInformationMessage(
        'No Git repository found in the workspace.'
      )
      return
    }

    const unstaged_file_paths: string[] = []
    for (const repo of git_api.repositories) {
      repo.state.workingTreeChanges.forEach((change: any) => {
        unstaged_file_paths.push(change.uri.fsPath)
      })
    }

    if (unstaged_file_paths.length === 0) {
      vscode.window.showInformationMessage('No unstaged files found.')
      return
    }

    const existing_unstaged_files = unstaged_file_paths.filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile()
      } catch {
        return false
      }
    })

    if (existing_unstaged_files.length == 0) {
      vscode.window.showInformationMessage(
        'No actionable unstaged files found (e.g. only deletions).'
      )
      return
    }

    const workspace_roots = workspace_provider.getWorkspaceRoots()
    const quick_pick_items = await Promise.all(
      existing_unstaged_files.map(async (file_path) => {
        const token_count = await workspace_provider.calculate_file_tokens(
          file_path
        )

        const formatted_token_count = display_token_count(token_count)

        return {
          label: path.basename(file_path),
          description: `${formatted_token_count} ${path.dirname(
            path.relative(workspace_roots[0] || '', file_path)
          )}`,
          picked: true,
          file_path: file_path
        }
      })
    )

    const selected_items = await vscode.window.showQuickPick(quick_pick_items, {
      canPickMany: true,
      placeHolder: 'Select files to include',
      title: `Found ${existing_unstaged_files.length} unstaged file${
        existing_unstaged_files.length == 1 ? '' : 's'
      }`
    })

    if (!selected_items || selected_items.length === 0) {
      return
    }

    const selected_paths = selected_items.map((item) => item.file_path)

    Logger.info({
      message: `Selected ${selected_paths.length} unstaged file${
        selected_paths.length == 1 ? '' : 's'
      }.`,
      data: { paths: selected_paths }
    })

    await workspace_provider.set_checked_files(selected_paths)
    vscode.window.showInformationMessage(
      `Selected ${selected_paths.length} file${
        selected_paths.length == 1 ? '' : 's'
      }.`
    )
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to select unstaged files: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    Logger.error({
      function_name: 'apply_context_command:unstaged',
      message: 'Failed to select unstaged files',
      data: error
    })
  }
}

import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { get_git_repository } from '../git-repository-utils'
import { Logger } from '../logger'

export const replace_changes_placeholder = async (
  instruction: string
): Promise<string> => {
  const matches = instruction.match(
    /@Changes:([^\s,;:.!?]+(?:\/[^\s,;:.!?]+)?)/
  )
  if (!matches) {
    return instruction
  }

  const branch_spec = matches[1]

  const multi_root_match = branch_spec.match(/^([^/]+)\/(.+)$/)

  if (multi_root_match) {
    const [, folder_name, branch_name] = multi_root_match

    const workspace_folders = vscode.workspace.workspaceFolders
    if (!workspace_folders) {
      vscode.window.showErrorMessage('No workspace folders found.')
      return instruction.replace(new RegExp(`@Changes:${branch_spec}`, 'g'), '')
    }

    const target_folder = workspace_folders.find(
      (folder) => folder.name == folder_name
    )
    if (!target_folder) {
      vscode.window.showErrorMessage(
        `Workspace folder "${folder_name}" not found.`
      )
      return instruction.replace(new RegExp(`@Changes:${branch_spec}`, 'g'), '')
    }

    try {
      // Get current branch name
      const current_branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: target_folder.uri.fsPath
      })
        .toString()
        .trim()

      // If comparing to same branch, use merge-base to show changes since branch point
      const diff_command =
        current_branch == branch_name
          ? `git diff $(git merge-base HEAD origin/${branch_name})`
          : `git diff ${branch_name}`
      const diff = execSync(diff_command, {
        cwd: target_folder.uri.fsPath
      }).toString()

      if (!diff || diff.length == 0) {
        vscode.window.showInformationMessage(
          `No changes found between current branch and ${branch_name} in ${folder_name}.`
        )
        return instruction.replace(
          new RegExp(`@Changes:${branch_spec}`, 'g'),
          ''
        )
      }

      const replacement_text = `\n\`\`\`diff\n${diff}\n\`\`\`\n`
      return instruction.replace(
        new RegExp(`@Changes:${branch_spec}`, 'g'),
        replacement_text
      )
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get changes from branch ${branch_name} in ${folder_name}. Make sure the branch exists.`
      )
      Logger.error({
        function_name: 'replace_changes_placeholder',
        message: `Error getting diff from branch ${branch_name} in folder ${folder_name}`,
        data: error
      })
      return instruction.replace(new RegExp(`@Changes:${branch_spec}`, 'g'), '')
    }
  } else {
    const branch_name = branch_spec
    const repository = get_git_repository()
    if (!repository) {
      vscode.window.showErrorMessage('No Git repository found.')
      return instruction.replace(new RegExp(`@Changes:${branch_name}`, 'g'), '')
    }

    try {
      // Get current branch name
      const current_branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repository.rootUri.fsPath
      })
        .toString()
        .trim()

      // If comparing to same branch, use merge-base to show changes since branch point
      const diff_command =
        current_branch == branch_name
          ? `git diff $(git merge-base HEAD origin/${branch_name})`
          : `git diff ${branch_name}`
      const diff = execSync(diff_command, {
        cwd: repository.rootUri.fsPath
      }).toString()

      if (!diff || diff.length == 0) {
        vscode.window.showInformationMessage(
          `No changes found between current branch and ${branch_name}.`
        )
        return instruction.replace(
          new RegExp(`@Changes:${branch_name}`, 'g'),
          ''
        )
      }

      const replacement_text = `\n\`\`\`diff\n${diff}\n\`\`\`\n`
      return instruction.replace(
        new RegExp(`@Changes:${branch_name}`, 'g'),
        replacement_text
      )
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to get changes from branch ${branch_name}. Make sure the branch exists.`
      )
      Logger.error({
        function_name: 'replace_changes_placeholder',
        message: `Error getting diff from branch ${branch_name}`,
        data: error
      })
      return instruction.replace(new RegExp(`@Changes:${branch_name}`, 'g'), '')
    }
  }
}

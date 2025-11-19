import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
export interface GitInfo {
  branch: string
  commit_hash: string
  has_git: boolean
}

export const get_git_info = async (
  workspace_folder: vscode.WorkspaceFolder
): Promise<GitInfo | null> => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspace_folder.uri.fsPath,
      encoding: 'utf8'
    }).trim()

    const commit_hash = execSync('git rev-parse HEAD', {
      cwd: workspace_folder.uri.fsPath,
      encoding: 'utf8'
    }).trim()

    return {
      branch,
      commit_hash,
      has_git: true
    }
  } catch (error) {
    return null
  }
}

export const get_git_diff = async (
  workspace_folder: vscode.WorkspaceFolder
): Promise<string | null> => {
  try {
    let diff = ''
    try {
      // Add --binary to handle binary files correctly.
      // execSync will throw if there are differences, so we catch it.
      diff = execSync('git diff --binary HEAD', {
        cwd: workspace_folder.uri.fsPath,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024 // 50MB max
      })
    } catch (e: any) {
      if (e.status === 1 && e.stdout) {
        // Exit code 1 means there are differences, which is not an error for us.
        diff = e.stdout.toString()
      } else {
        // Other exit codes indicate a real error.
        throw e
      }
    }

    const untracked_files = execSync(
      'git ls-files --others --exclude-standard',
      {
        cwd: workspace_folder.uri.fsPath,
        encoding: 'utf8'
      }
    )
      .trim()
      .split('\n')
      .filter((f) => f.length > 0)

    let untracked_diff = ''
    for (const file of untracked_files) {
      try {
        // Use git diff to create a patch for the new file, which handles binary files correctly.
        // execSync will throw if there are differences, but the diff will be in stdout.
        const file_diff = execSync(
          `git diff --no-index --binary /dev/null "${file}"`,
          {
            cwd: workspace_folder.uri.fsPath,
            encoding: 'utf8',
            maxBuffer: 50 * 1024 * 1024
          }
        )
        untracked_diff += file_diff
      } catch (err: any) {
        if (err.status === 1 && err.stdout) {
          // The diff output is in stdout of the error object
          untracked_diff += err.stdout.toString()
        } else {
          Logger.warn({
            function_name: 'get_git_diff',
            message: `Could not create diff for untracked file: ${file}`,
            data: err
          })
        }
      }
    }

    return diff + untracked_diff
  } catch (error) {
    Logger.error({
      function_name: 'get_git_diff',
      message: 'Error getting git diff',
      data: error
    })
    return null
  }
}

export const is_git_repository = async (
  workspace_folder: vscode.WorkspaceFolder
): Promise<boolean> => {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: workspace_folder.uri.fsPath,
      stdio: 'pipe'
    })
    return true
  } catch (error) {
    return false
  }
}

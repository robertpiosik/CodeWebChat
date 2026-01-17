import * as vscode from 'vscode'
import { exec } from 'child_process'
import { Logger } from '@shared/utils/logger'

const execAsync = (command: string, options: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        ;(error as any).stdout = stdout
        ;(error as any).stderr = stderr
        ;(error as any).status = error.code
        reject(error)
      } else {
        resolve(stdout.toString())
      }
    })
  })
}

export interface GitInfo {
  branch: string
  commit_hash: string
  has_git: boolean
}

export const get_git_info = async (
  workspace_folder: vscode.WorkspaceFolder
): Promise<GitInfo | null> => {
  try {
    const branch = (
      await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: workspace_folder.uri.fsPath,
        encoding: 'utf8'
      })
    ).trim()

    const commit_hash = (
      await execAsync('git rev-parse HEAD', {
        cwd: workspace_folder.uri.fsPath,
        encoding: 'utf8'
      })
    ).trim()

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
      // execAsync will reject if there are differences (exit code 1), so we catch it.
      diff = await execAsync('git diff --binary HEAD', {
        cwd: workspace_folder.uri.fsPath,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024 // 50MB max
      })
    } catch (e: any) {
      if (e.status == 1 && e.stdout) {
        // Exit code 1 means there are differences, which is not an error for us.
        diff = e.stdout.toString()
      } else {
        // Other exit codes indicate a real error.
        throw e
      }
    }

    const untracked_files = (
      await execAsync('git ls-files --others --exclude-standard', {
        cwd: workspace_folder.uri.fsPath,
        encoding: 'utf8'
      })
    )
      .trim()
      .split('\n')
      .filter((f) => f.length > 0)

    let untracked_diff = ''
    for (const file of untracked_files) {
      try {
        // Use git diff to create a patch for the new file, which handles binary files correctly.
        // execAsync will throw if there are differences, but the diff will be in stdout.
        const file_diff = await execAsync(
          `git diff --no-index --binary /dev/null "${file}"`,
          {
            cwd: workspace_folder.uri.fsPath,
            encoding: 'utf8',
            maxBuffer: 50 * 1024 * 1024
          }
        )
        untracked_diff += file_diff
      } catch (err: any) {
        if (err.status == 1 && err.stdout) {
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
    await execAsync('git rev-parse --git-dir', {
      cwd: workspace_folder.uri.fsPath
    })
    return true
  } catch (error) {
    return false
  }
}

import * as vscode from 'vscode'
import { exec } from 'child_process'
import { Logger } from '@shared/utils/logger'

const exec_async = (command: string, options: any): Promise<string> => {
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
      await exec_async('git rev-parse --abbrev-ref HEAD', {
        cwd: workspace_folder.uri.fsPath,
        encoding: 'utf8'
      })
    ).trim()

    const commit_hash = (
      await exec_async('git rev-parse HEAD', {
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
    const cwd = workspace_folder.uri.fsPath

    let total_diff = ''

    try {
      const tracked_diff = await exec_async('git diff --binary HEAD', {
        cwd,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      })
      if (tracked_diff) {
        total_diff += tracked_diff
      }
    } catch (err: any) {
      if (err.status === 1 && err.stdout) {
        total_diff += err.stdout.toString()
      } else {
        throw err
      }
    }

    const untracked_files_output = await exec_async(
      'git ls-files -z --others --exclude-standard',
      {
        cwd,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      }
    )
    const untracked_files = untracked_files_output
      .split('\0')
      .filter((f) => f.length > 0)

    const process_untracked_file = async (file: string) => {
      try {
        const cmd = `git diff --no-index --binary /dev/null "${file}"`
        const diff_chunk = await exec_async(cmd, {
          cwd,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024
        })
        return diff_chunk
      } catch (err: any) {
        if (err.status === 1 && err.stdout) {
          return err.stdout.toString()
        } else {
          Logger.warn({
            function_name: 'get_git_diff',
            message: `Could not create diff for file: ${file}`,
            data: err
          })
          return ''
        }
      }
    }

    const concurrency_limit = 20
    const untracked_diffs: string[] = []

    for (let i = 0; i < untracked_files.length; i += concurrency_limit) {
      const chunk = untracked_files.slice(i, i + concurrency_limit)
      const results = await Promise.all(chunk.map(process_untracked_file))
      untracked_diffs.push(...results)
    }

    total_diff += untracked_diffs.join('')

    return total_diff
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
    await exec_async('git rev-parse --git-dir', {
      cwd: workspace_folder.uri.fsPath
    })
    return true
  } catch (error) {
    return false
  }
}

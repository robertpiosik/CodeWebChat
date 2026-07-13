import * as vscode from 'vscode'
import { exec } from 'child_process'
import { Logger } from '@shared/utils/logger'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

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
    const cwd = workspace_folder.uri.fsPath
    const tmp_dir = os.tmpdir()

    // Get list of changed tracked files
    const tracked_files_output = await execAsync(
      'git diff -z --name-only HEAD',
      {
        cwd,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024 // 50MB max
      }
    )
    const tracked_files = tracked_files_output
      .split('\0')
      .filter((f) => f.length > 0)

    // Get list of untracked files
    const untracked_files_output = await execAsync(
      'git ls-files -z --others --exclude-standard',
      {
        cwd,
        encoding: 'utf8'
      }
    )
    const untracked_files = untracked_files_output
      .split('\0')
      .filter((f) => f.length > 0)

    const all_files = [
      ...tracked_files.map((f) => ({ file: f, is_untracked: false })),
      ...untracked_files.map((f) => ({ file: f, is_untracked: true }))
    ]

    let total_diff = ''

    for (const { file, is_untracked } of all_files) {
      const absolute_path = path.join(cwd, file)
      let mtime = 0

      try {
        const stats = await fs.stat(absolute_path)
        mtime = Math.floor(stats.mtimeMs)
      } catch {
        // File might be deleted or inaccessible
      }

      let diff_chunk = ''
      let cache_path = ''

      if (mtime > 0) {
        const path_hash = crypto
          .createHash('md5')
          .update(absolute_path)
          .digest('hex')
        const cache_filename = `cwc-checkpoint-cache-${path_hash}-${mtime}.txt`
        cache_path = path.join(tmp_dir, cache_filename)

        try {
          const cached_diff = await fs.readFile(cache_path, 'utf8')
          total_diff += cached_diff
          continue
        } catch {
          // Cache miss
        }
      }

      try {
        const cmd = is_untracked
          ? `git diff --no-index --binary /dev/null "${file}"`
          : `git diff --binary HEAD -- "${file}"`

        diff_chunk = await execAsync(cmd, {
          cwd,
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024
        })
      } catch (err: any) {
        if (err.status === 1 && err.stdout) {
          diff_chunk = err.stdout.toString()
        } else {
          Logger.warn({
            function_name: 'get_git_diff',
            message: `Could not create diff for file: ${file}`,
            data: err
          })
        }
      }

      if (diff_chunk) {
        total_diff += diff_chunk
        if (mtime > 0 && cache_path) {
          try {
            await fs.writeFile(cache_path, diff_chunk, 'utf8')
          } catch (e) {
            // Ignore cache write errors
          }
        }
      }
    }

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
    await execAsync('git rev-parse --git-dir', {
      cwd: workspace_folder.uri.fsPath
    })
    return true
  } catch (error) {
    return false
  }
}

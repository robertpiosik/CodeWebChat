import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as path from 'path'

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
          console.warn(`Could not create diff for untracked file: ${file}`, err)
        }
      }
    }

    return diff + untracked_diff
  } catch (error) {
    console.error('Error getting git diff:', error)
    return null
  }
}

export const apply_git_diff = async (
  workspace_folder: vscode.WorkspaceFolder,
  diff: string,
  target_commit?: string,
  target_branch?: string
): Promise<boolean> => {
  try {
    const cwd = workspace_folder.uri.fsPath
    let original_branch: string | null = null
    try {
      original_branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd,
        encoding: 'utf8'
      }).trim()
    } catch (err) {
      // Might be in detached HEAD state
      original_branch = null
    }
    if (target_commit) {
      const current_commit = execSync('git rev-parse HEAD', {
        cwd,
        encoding: 'utf8'
      }).trim()

      if (current_commit !== target_commit) {
        const current_branch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd,
          encoding: 'utf8'
        }).trim()

        if (target_branch && current_branch !== target_branch) {
          try {
            execSync(`git checkout ${target_branch}`, { cwd, stdio: 'pipe' })
          } catch (err) {
            console.warn(`Could not checkout branch ${target_branch}`)
          }
        }

        const after_branch_commit = execSync('git rev-parse HEAD', {
          cwd,
          encoding: 'utf8'
        }).trim()

        if (after_branch_commit !== target_commit) {
          execSync(`git reset --hard ${target_commit}`, { cwd })
        }
      }
    }

    execSync('git reset --hard HEAD', { cwd })
    execSync('git clean -fd', { cwd })

    if (diff && diff.length > 0) {
      const temp_diff_path = path.join(cwd, '.git', 'checkpoint.diff')
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(temp_diff_path),
        Buffer.from(diff, 'utf8')
      )

      try {
        execSync(`git apply "${temp_diff_path}"`, {
          cwd,
          stdio: 'pipe'
        })
      } catch (err) {
        // If git apply fails, try with --reject to apply what we can
        try {
          execSync(`git apply --reject "${temp_diff_path}"`, {
            cwd,
            stdio: 'pipe'
          })
          vscode.window.showWarningMessage(
            'Some changes could not be applied cleanly. Check .rej files.'
          )
        } catch (rejectErr) {
          throw new Error('Failed to apply diff')
        }
      } finally {
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(temp_diff_path))
        } catch (err) {}
      }
    }

    return true
  } catch (error) {
    console.error('Error applying git diff:', error)
    return false
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

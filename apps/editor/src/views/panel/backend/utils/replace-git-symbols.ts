import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { get_git_repository } from '@/utils/git-repository-utils'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'

const build_changes_xml = (
  diff: string,
  cwd: string,
  diff_base: string
): string => {
  // Split diff into per-file sections. Each section starts with 'diff --git '.
  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '')
  if (file_diffs.length == 0) {
    return ''
  }

  let changes_content = ''

  for (const file_diff_content of file_diffs) {
    const full_file_diff = 'diff --git ' + file_diff_content
    const lines = full_file_diff.split('\n')
    const old_path_line = lines.find((l) => l.startsWith('--- a/'))
    const new_path_line = lines.find((l) => l.startsWith('+++ b/'))

    const old_path = old_path_line
      ? old_path_line.substring('--- a/'.length)
      : undefined
    const new_path = new_path_line
      ? new_path_line.substring('+++ b/'.length)
      : undefined

    let file_path: string | undefined
    let is_deleted = false

    if (new_path && new_path != '/dev/null') {
      file_path = new_path
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path
      if (new_path == '/dev/null') {
        is_deleted = true
      }
    }

    if (file_path) {
      changes_content += `<file path="${file_path}">\n`

      let file_content = ''
      try {
        // Get the file content from the git revision we're diffing against.
        file_content = execSync(`git show ${diff_base}:"./${file_path}"`, {
          cwd,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'] // Prevent git errors from crashing (e.g., file not on branch)
        })
      } catch (e) {
        // File likely did not exist on the branch (i.e., it's a new file).
        // In this case, the original content is correctly an empty string.
        if (!is_deleted) {
          Logger.warn({
            function_name: 'build_changes_xml',
            message: `Could not get file content from git base ${diff_base} for path ${file_path}. Assuming it's a new file.`,
            data: e
          })
        }
      }
      changes_content += `<![CDATA[\n${full_file_diff}\n]]>\n`
      if (file_content) {
        changes_content += `<![CDATA[\n${file_content}\n]]>\n`
      }
      changes_content += `</file>\n`
    }
  }

  return changes_content ? `<changes>\n${changes_content}</changes>\n` : ''
}

export const replace_changes_symbol = async (params: {
  instruction: string
}): Promise<{ instruction: string; changes_definitions: string }> => {
  const regex = /#Changes\(([^)]+)\)/g
  const matches = [...params.instruction.matchAll(regex)]

  let result_instruction = params.instruction
  let changes_definitions = ''

  if (matches.length == 0) {
    return { instruction: result_instruction, changes_definitions }
  }

  for (const match of matches) {
    const branch_spec = match[1]
    const escaped_branch_spec = branch_spec.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )
    const replacement_regex = new RegExp(
      `\\s*#Changes\\(${escaped_branch_spec}\\)\\s*`
    )

    // Skip if the placeholder is already gone (e.g., duplicate processing)
    if (!replacement_regex.test(result_instruction)) {
      continue
    }

    const multi_root_match = branch_spec.match(/^([^/]+)\/(.+)$/)

    if (multi_root_match) {
      const [, folder_name, branch_name] = multi_root_match

      const workspace_folders = vscode.workspace.workspaceFolders
      if (!workspace_folders) {
        vscode.window.showErrorMessage(
          dictionary.error_message.NO_WORKSPACE_FOLDERS_FOUND
        )
        result_instruction = result_instruction.replace(replacement_regex, '')
        continue
      }

      const target_folder = workspace_folders.find(
        (folder) => folder.name == folder_name
      )
      if (!target_folder) {
        vscode.window.showErrorMessage(
          dictionary.error_message.WORKSPACE_FOLDER_NOT_FOUND(folder_name)
        )
        result_instruction = result_instruction.replace(replacement_regex, '')
        continue
      }

      try {
        const current_branch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: target_folder.uri.fsPath
        })
          .toString()
          .trim()

        let diff_base: string
        if (current_branch == branch_name) {
          // If comparing to same branch, use merge-base to show changes since branch point
          diff_base = execSync(`git merge-base HEAD origin/${branch_name}`, {
            cwd: target_folder.uri.fsPath
          })
            .toString()
            .trim()
        } else {
          diff_base = branch_name
        }
        const diff_command = `git diff ${diff_base}`
        const diff = execSync(diff_command, {
          cwd: target_folder.uri.fsPath
        }).toString()

        if (!diff || diff.length == 0) {
          vscode.window.showInformationMessage(
            dictionary.information_message.NO_CHANGES_FOUND_BETWEEN_BRANCHES_IN_FOLDER(
              branch_name,
              folder_name
            )
          )
          result_instruction = result_instruction.replace(replacement_regex, '')
          continue
        }

        const replacement_text = build_changes_xml(
          diff,
          target_folder.uri.fsPath,
          diff_base
        )
        changes_definitions += replacement_text
        result_instruction = result_instruction.replace(
          replacement_regex,
          ` <changes branch="${branch_spec}" /> `
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_GET_CHANGES_FROM_BRANCH_IN_FOLDER(
            branch_name,
            folder_name
          )
        )
        Logger.error({
          function_name: 'replace_changes_placeholder',
          message: `Error getting diff from branch ${branch_name} in folder ${folder_name}`,
          data: error
        })
        result_instruction = result_instruction.replace(replacement_regex, '')
      }
    } else {
      const branch_name = branch_spec
      const repository = await get_git_repository()
      if (!repository) {
        vscode.window.showErrorMessage(
          dictionary.error_message.NO_GIT_REPOSITORY_FOUND
        )
        result_instruction = result_instruction.replace(replacement_regex, '')
        continue
      }

      try {
        const current_branch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: repository.rootUri.fsPath
        })
          .toString()
          .trim()

        let diff_base: string
        if (current_branch == branch_name) {
          // If comparing to same branch, use merge-base to show changes since branch point
          diff_base = execSync(`git merge-base HEAD origin/${branch_name}`, {
            cwd: repository.rootUri.fsPath
          })
            .toString()
            .trim()
        } else {
          diff_base = branch_name
        }
        const diff_command = `git diff ${diff_base}`
        const diff = execSync(diff_command, {
          cwd: repository.rootUri.fsPath
        }).toString()

        if (!diff || diff.length == 0) {
          vscode.window.showInformationMessage(
            dictionary.information_message.NO_CHANGES_FOUND_BETWEEN_BRANCHES(
              branch_name
            )
          )
          result_instruction = result_instruction.replace(replacement_regex, '')
          continue
        }

        const replacement_text = build_changes_xml(
          diff,
          repository.rootUri.fsPath,
          diff_base
        )
        changes_definitions += replacement_text
        result_instruction = result_instruction.replace(
          replacement_regex,
          ` <changes branch="${branch_spec}" /> `
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_GET_CHANGES_FROM_BRANCH(
            branch_name
          )
        )
        Logger.error({
          function_name: 'replace_changes_placeholder',
          message: `Error getting diff from branch ${branch_name}`,
          data: error
        })
        result_instruction = result_instruction.replace(replacement_regex, '')
      }
    }
  }

  return { instruction: result_instruction, changes_definitions }
}

const build_commit_changes_xml = (
  diff: string,
  cwd: string,
  commit_hash: string,
  commit_message?: string
): string => {
  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '')

  if (file_diffs.length == 0) {
    return ''
  }

  let changes_content = ''

  for (const file_diff_content of file_diffs) {
    const full_file_diff = 'diff --git ' + file_diff_content
    const lines = full_file_diff.split('\n')
    const old_path_line = lines.find((l) => l.startsWith('--- a/'))
    const new_path_line = lines.find((l) => l.startsWith('+++ b/'))

    const old_path = old_path_line
      ? old_path_line.substring('--- a/'.length)
      : undefined
    const new_path = new_path_line
      ? new_path_line.substring('+++ b/'.length)
      : undefined

    let file_path: string | undefined
    let is_deleted = false

    if (new_path && new_path != '/dev/null') {
      file_path = new_path
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path
      if (new_path == '/dev/null') {
        is_deleted = true
      }
    }

    if (file_path) {
      let file_content = ''
      if (!is_deleted) {
        try {
          file_content = execSync(`git show ${commit_hash}:"./${file_path}"`, {
            cwd,
            encoding: 'utf-8'
          })
        } catch (e) {
          Logger.error({
            function_name: 'build_commit_changes_xml',
            message: `Could not read file for diff from commit: ${file_path}`,
            data: e
          })
        }
      }

      changes_content += `<file path="${file_path}">\n`
      changes_content += `<![CDATA[\n${full_file_diff}\n]]>\n`
      if (file_content) {
        changes_content += `<![CDATA[\n${file_content}\n]]>\n`
      }
      changes_content += `</file>\n`
    }
  }

  if (changes_content) {
    const safe_message = (commit_message || '').replace(/"/g, '&quot;')
    return `<commit message="${safe_message}">\n${changes_content}</commit>\n`
  }
  return ''
}

export const replace_commit_symbol = async (params: {
  instruction: string
}): Promise<{ instruction: string; commit_definitions: string }> => {
  const regex = /#Commit\(([^:]+):([a-fA-F0-9]+)\s*(?:"((?:[^"\\]|\\.)*)")?\)/g

  let result_instruction = params.instruction
  let commit_definitions = ''
  const matches = [...result_instruction.matchAll(regex)]

  const workspace_folders = vscode.workspace.workspaceFolders
  if (!workspace_folders) {
    return {
      instruction: result_instruction.replace(regex, ''),
      commit_definitions: ''
    }
  }

  for (const match of matches) {
    const full_match = match[0]
    const folder_name = match[1]
    const commit_hash = match[2]
    const commit_message = match[3]?.replace(/\\(.)/g, '$1')

    const target_folder = workspace_folders.find(
      (folder) => folder.name === folder_name
    )
    if (!target_folder) {
      vscode.window.showErrorMessage(
        dictionary.error_message.WORKSPACE_FOLDER_NOT_FOUND(folder_name)
      )
      result_instruction = result_instruction.replace(full_match, '')
      continue
    }

    try {
      const diff = execSync(`git show ${commit_hash}`, {
        cwd: target_folder.uri.fsPath,
        encoding: 'utf-8'
      }).toString()

      if (!diff || diff.length == 0) {
        vscode.window.showInformationMessage(
          dictionary.information_message.COMMIT_SEEMS_EMPTY(commit_hash)
        )
        result_instruction = result_instruction.replace(full_match, '')
        continue
      }

      const replacement_text = build_commit_changes_xml(
        diff,
        target_folder.uri.fsPath,
        commit_hash,
        commit_message
      )
      commit_definitions += replacement_text

      const safe_message = (commit_message || '').replace(/"/g, '&quot;')

      result_instruction = result_instruction.replace(
        new RegExp(
          `\\s*${full_match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`
        ),
        ` <commit message="${safe_message}" /> `
      )
    } catch (error) {
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_GET_DIFF_FOR_COMMIT(commit_hash)
      )
      Logger.error({
        function_name: 'replace_commit_placeholder',
        message: `Error getting diff for commit ${commit_hash}`,
        data: error
      })
      result_instruction = result_instruction.replace(full_match, '')
    }
  }
  return { instruction: result_instruction, commit_definitions }
}

const build_context_at_commit_xml = (
  files_content: { path: string; content: string }[]
): string => {
  if (files_content.length == 0) {
    return '<archive/>'
  }

  let files_xml = ''
  for (const file of files_content) {
    files_xml += `<file path="${file.path.replace(/\\/g, '/')}">\n<![CDATA[\n${
      file.content
    }\n]]>\n</file>\n`
  }

  return `\n<archive>\n${files_xml}</archive>\n`
}

export const replace_context_at_commit_symbol = async (params: {
  instruction: string
  workspace_provider: WorkspaceProvider
}): Promise<string> => {
  const regex =
    /#ContextAtCommit\(([^:]+):([a-fA-F0-9]+)\s*(?:"((?:[^"\\]|\\.)*)")?\)/g

  let result_instruction = params.instruction
  const matches = [...result_instruction.matchAll(regex)]

  const workspace_folders = vscode.workspace.workspaceFolders
  if (!workspace_folders) {
    return result_instruction.replace(regex, '')
  }

  for (const match of matches) {
    const full_match = match[0]
    const folder_name = match[1]
    const commit_hash = match[2]

    const target_folder = workspace_folders.find(
      (folder) => folder.name == folder_name
    )

    if (!target_folder) {
      vscode.window.showErrorMessage(
        dictionary.error_message.WORKSPACE_FOLDER_NOT_FOUND(folder_name)
      )
      result_instruction = result_instruction.replace(full_match, '')
      continue
    }

    const checked_files = params.workspace_provider.get_checked_files()
    const files_in_repo = checked_files.filter((file) =>
      file.startsWith(target_folder.uri.fsPath)
    )

    if (files_in_repo.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_CHECKED_FILES_IN_REPO_FOR_COMMIT(
          folder_name,
          commit_hash.substring(0, 7)
        )
      )
    }

    const files_content: { path: string; content: string }[] = []

    for (const file_path of files_in_repo) {
      const relative_path = path.relative(target_folder.uri.fsPath, file_path)

      let content_at_commit: string | null = null
      try {
        content_at_commit = execSync(
          `git show ${commit_hash}:"./${relative_path.replace(/\\/g, '/')}"`,
          {
            cwd: target_folder.uri.fsPath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore'] // ignore stderr
          }
        )
      } catch (error) {
        // File might not have existed at that commit
      }

      let current_content: string | null = null
      try {
        current_content = fs.readFileSync(file_path, 'utf-8')
      } catch (error) {
        // File might not exist in workspace (e.g., deleted)
      }

      if (content_at_commit === current_content) {
        continue // File is unchanged, ignore it
      }

      if (content_at_commit !== null) {
        // If we are here, file has changed (modified, new, or deleted)
        // Add its historical content to the archive.
        const display_path =
          params.workspace_provider.get_workspace_roots().length > 1
            ? `${folder_name}/${relative_path.replace(/\\/g, '/')}`
            : relative_path.replace(/\\/g, '/')

        files_content.push({ path: display_path, content: content_at_commit })
      }
    }

    if (files_in_repo.length > 0 && files_content.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.ALL_CHECKED_FILES_UNCAHNGED_SINCE_COMMIT(
          folder_name,
          commit_hash.substring(0, 7)
        )
      )
    }

    const replacement_text = build_context_at_commit_xml(files_content)
    result_instruction = result_instruction.replace(
      full_match,
      replacement_text
    )
  }

  return result_instruction
}

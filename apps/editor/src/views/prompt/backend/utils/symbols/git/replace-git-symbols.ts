import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { get_git_repository } from '@/utils/git-repository-utils'
import { AsciiTree } from '@/utils/ascii-tree/ascii-tree'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

const patch_diff_paths = (
  diff_text: string,
  path_prefix: string,
  file_path: string,
  old_path?: string,
  new_path?: string
): string => {
  const lines = diff_text.split('\n')
  const a_path_orig = old_path || file_path
  const b_path_orig = new_path || file_path

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('diff --git ')) {
      lines[i] =
        `diff --git a/${path_prefix}/${a_path_orig} b/${path_prefix}/${b_path_orig}`
    } else if (lines[i].startsWith('--- a/')) {
      lines[i] = `--- a/${path_prefix}/${a_path_orig}`
    } else if (lines[i].startsWith('+++ b/')) {
      lines[i] = `+++ b/${path_prefix}/${b_path_orig}`
    } else if (lines[i].startsWith('rename from ')) {
      lines[i] =
        `rename from ${path_prefix}/${lines[i].substring('rename from '.length)}`
    } else if (lines[i].startsWith('rename to ')) {
      lines[i] =
        `rename to ${path_prefix}/${lines[i].substring('rename to '.length)}`
    } else if (lines[i].startsWith('copy from ')) {
      lines[i] =
        `copy from ${path_prefix}/${lines[i].substring('copy from '.length)}`
    } else if (lines[i].startsWith('copy to ')) {
      lines[i] =
        `copy to ${path_prefix}/${lines[i].substring('copy to '.length)}`
    }
  }
  return lines.join('\n')
}

const build_changes_markdown = (
  diff: string,
  cwd: string,
  diff_base: string,
  branch_name: string,
  path_prefix?: string
): string => {
  // Split diff into per-file sections. Each section starts with 'diff --git '.
  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '')
  if (file_diffs.length == 0) {
    return ''
  }

  let changes_content = ''

  for (const file_diff_content of file_diffs) {
    let full_file_diff = 'diff --git ' + file_diff_content
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
      const display_path = path_prefix
        ? `${path_prefix}/${file_path}`
        : file_path

      changes_content += `### File: \`${display_path}\`\n\n`

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
            function_name: 'build_changes_markdown',
            message: `Could not get file content from git base ${diff_base} for path ${file_path}. Assuming it's a new file.`,
            data: e
          })
        }
      }

      if (path_prefix) {
        full_file_diff = patch_diff_paths(
          full_file_diff,
          path_prefix,
          file_path,
          old_path,
          new_path
        )
      }

      changes_content += `\`\`\`\n${full_file_diff}\n\`\`\`\n\n`
      if (file_content) {
        changes_content += `\`\`\`\n${file_content}\n\`\`\`\n\n`
      }
    }
  }

  return changes_content
    ? `# Diff with ${branch_name}\n\n${changes_content}`
    : ''
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

        const replacement_text = build_changes_markdown(
          diff,
          target_folder.uri.fsPath,
          diff_base,
          branch_name,
          workspace_folders.length > 1 ? folder_name : undefined
        )
        changes_definitions += replacement_text
        const link_hash = `diff-with-${branch_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}`
        result_instruction = result_instruction.replace(
          replacement_regex,
          ` [Diff with ${branch_name}](#${link_hash}) `
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_GET_CHANGES_FROM_BRANCH_IN_FOLDER(
            branch_name,
            folder_name
          )
        )
        Logger.error({
          function_name: 'replace_changes_symbol',
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

        const replacement_text = build_changes_markdown(
          diff,
          repository.rootUri.fsPath,
          diff_base,
          branch_name
        )
        changes_definitions += replacement_text
        const link_hash = `diff-with-${branch_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}`
        result_instruction = result_instruction.replace(
          replacement_regex,
          ` [Diff with ${branch_name}](#${link_hash}) `
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_GET_CHANGES_FROM_BRANCH(
            branch_name
          )
        )
        Logger.error({
          function_name: 'replace_changes_symbol',
          message: `Error getting diff from branch ${branch_name}`,
          data: error
        })
        result_instruction = result_instruction.replace(replacement_regex, '')
      }
    }
  }

  return { instruction: result_instruction, changes_definitions }
}

const build_commit_changes_markdown = (
  diff: string,
  cwd: string,
  commit_hash: string,
  path_prefix?: string,
  commit_message?: string
): string => {
  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '')

  if (file_diffs.length == 0) {
    return ''
  }

  let changes_content = ''

  for (const file_diff_content of file_diffs) {
    let full_file_diff = 'diff --git ' + file_diff_content
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
      const display_path = path_prefix
        ? `${path_prefix}/${file_path}`
        : file_path

      changes_content += `### File: \`${display_path}\`\n\n`

      let file_content = ''
      if (!is_deleted) {
        try {
          file_content = execSync(`git show ${commit_hash}:"./${file_path}"`, {
            cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
          })
        } catch (e) {
          Logger.error({
            function_name: 'build_commit_changes_markdown',
            message: `Could not read file for diff from commit: ${file_path}`,
            data: e
          })
        }
      }

      if (path_prefix) {
        full_file_diff = patch_diff_paths(
          full_file_diff,
          path_prefix,
          file_path,
          old_path,
          new_path
        )
      }

      changes_content += `\`\`\`\n${full_file_diff}\n\`\`\`\n\n`
      if (file_content) {
        changes_content += `\`\`\`\n${file_content}\n\`\`\`\n\n`
      }
    }
  }

  if (changes_content) {
    const short_hash = commit_hash.substring(0, 7)
    const title_text = `Commit ${short_hash}`
    let msg_text = ''
    if (commit_message) {
      const trimmed = commit_message.trim()
      if (trimmed) {
        const lines = trimmed.split('\n')
        const first_line = `**${lines[0].trim()}**`
        const rest = lines.slice(1).join('\n')
        msg_text = `${rest ? `${first_line}\n${rest}` : first_line}\n\n`
      }
    }
    return `# ${title_text}\n\n${msg_text}${changes_content}`
  }
  return ''
}

export const replace_commit_symbol = async (params: {
  instruction: string
}): Promise<{ instruction: string; commit_definitions: string }> => {
  const regex =
    /#(Commit|CommitMessage)\(([^:]+):([a-fA-F0-9]+)\s*(?:"((?:[^"\\]|\\.)*)")?\)/g

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
    const symbol_type = match[1]
    const folder_name = match[2]
    const commit_hash = match[3]
    const commit_message = match[4]?.replace(/\\(.)/g, '$1')

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
      let replacement_text = ''

      let commit_message_body = ''
      try {
        const raw_msg = execSync(`git show -s --format=%B ${commit_hash}`, {
          cwd: target_folder.uri.fsPath,
          encoding: 'utf-8'
        }).toString()
        commit_message_body = AsciiTree.strip_from_text(raw_msg)
      } catch (error) {
        Logger.warn({
          function_name: 'replace_commit_symbol',
          message: `Failed to read commit message for ${commit_hash}`,
          data: error
        })
      }

      const short_hash = commit_hash.substring(0, 7)
      const header_text = `Commit ${short_hash}`
      const title_text = commit_message
        ? `Commit ${short_hash} (${commit_message})`
        : `Commit ${short_hash}`
      const link_hash = header_text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      if (symbol_type === 'Commit') {
        const diff = execSync(`git show ${commit_hash}`, {
          cwd: target_folder.uri.fsPath,
          encoding: 'utf-8'
        }).toString()

        if (!diff || diff.length == 0) {
          vscode.window.showInformationMessage(
            t(
              'views.prompt.handlers.utils.symbols.git.replace-git-symbols.commit-seems-empty',
              { commit_hash }
            )
          )
          result_instruction = result_instruction.replace(full_match, '')
          continue
        }

        replacement_text = build_commit_changes_markdown(
          diff,
          target_folder.uri.fsPath,
          commit_hash,
          workspace_folders.length > 1 ? folder_name : undefined,
          commit_message_body
        )
      } else {
        if (commit_message_body) {
          replacement_text = `---\n\n${commit_message_body}\n\n---\n\n`
        }
      }

      if (symbol_type === 'Commit') {
        commit_definitions += replacement_text
        result_instruction = result_instruction.replace(
          new RegExp(
            `\\s*${full_match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`
          ),
          ` [${title_text}](#${link_hash}) `
        )
      } else {
        result_instruction = result_instruction.replace(
          new RegExp(
            `\\s*${full_match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`
          ),
          `\n\n${replacement_text}`
        )
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_GET_DIFF_FOR_COMMIT(commit_hash)
      )
      Logger.error({
        function_name: 'replace_commit_symbol',
        message: `Error getting diff for commit ${commit_hash}`,
        data: error
      })
      result_instruction = result_instruction.replace(full_match, '')
    }
  }
  return { instruction: result_instruction, commit_definitions }
}

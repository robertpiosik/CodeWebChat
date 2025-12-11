import { FileData } from './file-utils'
import * as vscode from 'vscode'
import { commit_message_instructions } from '@/constants/instructions'

export const strip_wrapping_quotes = (text: string): string => {
  const trimmed = text.trim()

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.substring(1, trimmed.length - 1).trim()
  }
  return trimmed
}

const get_commit_message_instructions = (): string => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions = config.get<string>('commitMessageInstructions')
  return instructions || commit_message_instructions
}

export const build_commit_message_prompt = (
  affected_files_data: FileData[],
  diff: string
): string => {
  const commit_message_prompt = get_commit_message_instructions()

  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '')

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

    let final_diff_content = full_file_diff

    let file_path: string | undefined

    if (new_path && new_path != '/dev/null') {
      file_path = new_path
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path
      // Shorten diff of a deleted file
      const split_diff = full_file_diff.split('+++ /dev/null')
      final_diff_content = split_diff[0] + '+++ /dev/null'
    }

    if (file_path) {
      const file_data = affected_files_data.find(
        (f) => f.relative_path == file_path
      )
      changes_content += `\n### File: \`${file_path}\`\n\n`
      if (file_data) {
        changes_content += `The original state of the file for reference:\n\n<![CDATA[\n${file_data.content}\n]]>\n\n`
      }
      changes_content += `**New changes:**\n\n<![CDATA[\n${final_diff_content}\n]]>\n`
    }
  }

  return `${commit_message_prompt}\n${changes_content}\n${commit_message_prompt}`
}

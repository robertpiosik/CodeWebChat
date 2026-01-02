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

  let changes_content = '<files>\n'
  for (const file_diff_content of file_diffs) {
    const full_file_diff = 'diff --git ' + file_diff_content
    const lines = full_file_diff.split('\n')
    const old_path_line = lines.find((l) => l.startsWith('--- a/'))
    const new_path_line = lines.find((l) => l.startsWith('+++ b/'))
    const rename_from_line = lines.find((l) => l.startsWith('rename from '))

    const old_path = old_path_line
      ? old_path_line.substring('--- a/'.length)
      : undefined
    const new_path = new_path_line
      ? new_path_line.substring('+++ b/'.length)
      : undefined

    let final_diff_content = full_file_diff

    let file_path: string | undefined
    let is_deleted = false

    if (new_path && new_path != '/dev/null') {
      file_path = new_path
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path
      is_deleted = true
      // Shorten diff of a deleted file
      const split_diff = full_file_diff.split('+++ /dev/null')
      final_diff_content = split_diff[0] + '+++ /dev/null'
    } else {
      // Fallback: try to identify file from diff header (e.g. binary files)
      const diff_header = lines[0]
      const matched_file = affected_files_data.find((f) => {
        const normalized_path = f.relative_path.replace(/\\/g, '/')
        return (
          diff_header.includes(`/${normalized_path} `) ||
          diff_header.endsWith(`/${normalized_path}`)
        )
      })

      if (matched_file) {
        file_path = matched_file.relative_path
      }
    }

    if (file_path) {
      const file_data = affected_files_data.find(
        (f) => f.relative_path == file_path
      )

      let status = 'updated'

      if (file_data) {
        if (file_data.status == 2) {
          status = 'created'
        } else if (file_data.status == 3) {
          status = 'deleted'
          is_deleted = true
        } else if (file_data.status == 4) {
          status = 'renamed'
        }
      } else {
        if (is_deleted) {
          status = 'deleted'
        } else if (!old_path && new_path) {
          status = 'created'
        }
      }

      let old_path_attr: string | undefined
      if (status == 'renamed') {
        if (rename_from_line) {
          old_path_attr = rename_from_line
            .substring('rename from '.length)
            .trim()
        } else {
          const diff_header = lines[0]
          const b_part = ` b/${file_path}`
          if (diff_header.endsWith(b_part)) {
            const prefix_len = 'diff --git '.length
            const a_part = diff_header.substring(
              prefix_len,
              diff_header.length - b_part.length
            )
            if (a_part.startsWith('a/')) {
              old_path_attr = a_part.substring(2)
            }
          }
        }
      }

      changes_content += `<file path="${file_path}" status="${status}"`
      if (old_path_attr) {
        changes_content += ` old_path="${old_path_attr}"`
      }
      changes_content += '>\n'

      if (status == 'created' || status == 'deleted') {
        if (file_data) {
          changes_content += `<![CDATA[\n${file_data.content}\n]]>\n`
        }
      } else if (status == 'renamed') {
        if (old_path && new_path) {
          changes_content += `<![CDATA[\n${final_diff_content}\n]]>\n`
        }
        if (file_data) {
          changes_content += `<![CDATA[\n${file_data.content}\n]]>\n`
        }
      } else {
        changes_content += `<![CDATA[\n${final_diff_content}\n]]>\n`
        if (file_data) {
          changes_content += `<![CDATA[\n${file_data.content}\n]]>\n`
        }
      }
      changes_content += `</file>\n`
    }
  }

  changes_content += '</files>'

  return `${commit_message_prompt}\n${changes_content}\n${commit_message_prompt}`
}

import * as vscode from 'vscode'
import { commit_message_instructions } from '@/constants/instructions'

export const build_commit_message_prompt = (diff: string): string => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions = config.get<string>('commitMessageInstructions')
  const commit_message_prompt = instructions || commit_message_instructions

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
      // diff --git a/path b/path
      const diff_header = lines[0]
      const match = diff_header.match(/^diff --git a\/(.*) b\/(.*)$/)
      if (match) {
        file_path = match[2]
      }
    }

    if (file_path) {
      let status = 'updated'

      if (is_deleted) {
        status = 'deleted'
      } else if (!old_path && new_path) {
        status = 'created'
      } else if (rename_from_line) {
        status = 'renamed'
      } else if (lines.some((l) => l.startsWith('new file mode'))) {
        status = 'created'
      } else if (lines.some((l) => l.startsWith('deleted file mode'))) {
        status = 'deleted'
        is_deleted = true
      }

      let old_path_attr: string | undefined
      if (status == 'renamed') {
        if (rename_from_line) {
          old_path_attr = rename_from_line
            .substring('rename from '.length)
            .trim()
        }
      }

      changes_content += `<file path="${file_path}" status="${status}"`
      if (old_path_attr) {
        changes_content += ` old_path="${old_path_attr}"`
      }
      changes_content += '>\n'
      changes_content += `<![CDATA[\n${final_diff_content}\n]]>\n`
      changes_content += `</file>\n`
    }
  }

  changes_content += '</files>'

  return `${commit_message_prompt}\n${changes_content}\n${commit_message_prompt}`
}

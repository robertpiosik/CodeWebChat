import { FileData } from './file-utils'

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

export const build_commit_message_prompt = (
  commit_message_prompt: string,
  affected_files_data: FileData[],
  diff: string
): string => {
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

    let file_path: string | undefined

    if (new_path && new_path != '/dev/null') {
      file_path = new_path
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path
    }

    if (file_path) {
      const file_data = affected_files_data.find(
        (f) => f.relative_path === file_path
      )
      changes_content += `<change path="${file_path}">\n`
      changes_content += `<diff>\n<![CDATA[\n${full_file_diff}\n]]>\n</diff>\n`
      if (file_data) {
        changes_content += `<file>\n<![CDATA[\n${file_data.content}\n]]>\n</file>\n`
      }
      changes_content += `</change>\n`
    }
  }

  const changes_xml = `<changes>\n${changes_content}</changes>`

  return `${commit_message_prompt}\n${changes_xml}\n${commit_message_prompt}`
}


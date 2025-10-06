import { FileData } from './file-utils'

export const build_files_content = (files_data: FileData[]): string => {
  if (!files_data || files_data.length == 0) {
    return 'No relevant files to include.'
  }

  return files_data
    .map((file) => {
      return `File: ${file.relative_path}\nContent:\n${file.content}`
    })
    .join('\n---\n')
}

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
  affected_files: string,
  diff: string
): string => {
  return `${commit_message_prompt}\n${affected_files}\n${diff}\n${commit_message_prompt}`
}

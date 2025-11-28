import { search_paths } from '@shared/utils/search-paths'

export const get_file_match_hint_data = (
  value: string,
  caret_position: number,
  context_file_paths: string[] | undefined
): { word: string; path: string } | null => {
  if (
    !value ||
    caret_position !== value.length ||
    value.endsWith(' ') ||
    value.endsWith('\n') ||
    !context_file_paths
  ) {
    return null
  }

  // Check if cursor is at the end of a shortened filename
  const text_before_cursor = value.substring(0, caret_position)
  const filename_match = text_before_cursor.match(
    /([^\s,;:!?`]*\.[^\s,;:!?`]+)$/
  )

  if (filename_match) {
    const filename = filename_match[1]
    const is_shortened_filename = context_file_paths.some(
      (path) => path.endsWith('/' + filename) || path === filename
    )
    if (is_shortened_filename) {
      return null
    }
  }

  const last_word = value.trim().split(/\s+/).pop()

  if (last_word && last_word.length >= 3) {
    const matching_paths = search_paths({
      paths: context_file_paths,
      search_value: last_word
    })
    if (matching_paths.length == 1) {
      return { word: last_word, path: matching_paths[0] }
    }
  }

  return null
}

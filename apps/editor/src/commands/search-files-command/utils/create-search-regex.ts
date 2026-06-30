export const create_search_regex = (search_term: string): RegExp => {
  let actual_term = search_term
  let match_whole_word = false

  if (
    actual_term.length >= 2 &&
    actual_term.startsWith('"') &&
    actual_term.endsWith('"')
  ) {
    match_whole_word = true
    actual_term = actual_term.slice(1, -1)
  }

  const escaped_term = actual_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let pattern = escaped_term.replace(/\s+/g, '\\s+')

  if (match_whole_word) {
    pattern = `\\b${pattern}\\b`
  }

  return new RegExp(pattern, 'mi')
}

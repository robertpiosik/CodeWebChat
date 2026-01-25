// Short commit messages should not end with dot, unless there are other dots followed by a space in the message
export const process_single_trailing_dot = (text: string): string => {
  const trimmed_text = text.trim()
  // Count the number of dots that are followed by whitespace
  const dot_count = (trimmed_text.match(/\.\s/g) || []).length

  if (dot_count == 1) {
    return trimmed_text
  }

  if (trimmed_text.endsWith('.')) {
    return trimmed_text.slice(0, -1)
  }

  return trimmed_text
}

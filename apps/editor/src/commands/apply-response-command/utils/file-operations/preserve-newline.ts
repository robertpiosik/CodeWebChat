export const preserve_trailing_newline = (original_content: string, new_content: string): string => {
  if (original_content.endsWith('\n') && !new_content.endsWith('\n')) {
    return new_content + '\n'
  }
  return new_content
}

export const get_display_text = (
  text: string,
  context_file_paths: string[]
): string => {
  return text.replace(/`([^\s`]*\.[^\s`]+)`/g, (match, file_path) => {
    if (context_file_paths.includes(file_path)) {
      const filename = file_path.split('/').pop() || file_path
      return filename
    }
    return match
  })
}

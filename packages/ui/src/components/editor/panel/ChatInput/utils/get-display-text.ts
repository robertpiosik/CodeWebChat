export const get_display_text = (
  text: string,
  context_file_paths: string[]
): string => {
  // Replace file paths in backticks with just the filename (no backticks)
  return text.replace(/`([^\s`]*\.[^\s`]+)`/g, (match, file_path) => {
    if (context_file_paths.includes(file_path)) {
      // Extract just the filename from the path
      const filename = file_path.split('/').pop() || file_path
      return filename
    }
    return match
  })
}

export const get_display_text = (
  text: string,
  context_file_paths: string[]
): string => {
  const regex =
    /`([^\s`]*\.[^\s`]+)`|(#Changes:[^\s,;:!?]+)|(#SavedContext:(?:WorkspaceState|JSON)\s+"([^"]+)")/g
  return text.replace(
    regex,
    (
      match,
      file_path,
      changes_keyword,
      saved_context_keyword,
      context_name
    ) => {
      if (file_path) {
        if (context_file_paths.includes(file_path)) {
          const filename = file_path.split('/').pop() || file_path
          return filename
        }
        return match
      }
      if (changes_keyword) {
        const branch_name = changes_keyword.substring('#Changes:'.length)
        return `Changes: ${branch_name}`
      }
      if (saved_context_keyword) {
        return `Context: ${context_name}`
      }
      return match
    }
  )
}

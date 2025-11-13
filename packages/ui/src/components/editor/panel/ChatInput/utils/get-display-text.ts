export const get_display_text = (
  text: string,
  context_file_paths: string[]
): string => {
  const regex = /`([^\s`]*\.[^\s`]+)`|(#Changes:[^\s,;:!?]+)/g
  return text.replace(regex, (match, file_path, changes_keyword) => {
    if (file_path) {
      if (context_file_paths.includes(file_path)) {
        const filename = file_path.split('/').pop() || file_path
        return filename
      }
      return match
    }
    if (changes_keyword) {
      return 'Changes'
    }
    return match
  })
}

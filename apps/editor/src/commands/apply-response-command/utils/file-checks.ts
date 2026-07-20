import { FileItem } from './clipboard-parser'

export const check_for_conflict_markers = (files: FileItem[]): boolean => {
  for (const file of files) {
    const content = file.content
    if (
      content.includes('<<<<<<<') &&
      content.includes('=======') &&
      content.includes('>>>>>>>')
    ) {
      return true
    }
  }
  return false
}

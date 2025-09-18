import * as fs from 'fs'

/**
 * Utility to extract all possible extension variations from a file path
 * For example, "file.scss.d.ts" would return ["ts", "d.ts", "scss.d.ts"]
 */
export function extract_extension_variations(file_path: string): string[] {
  const filename = file_path.split(/[\\/]/).pop() || ''
  const parts = filename.split('.')

  if (parts.length <= 1) {
    return []
  }

  parts.shift()

  const extensions: string[] = []
  let current_ext = ''

  for (let i = parts.length - 1; i >= 0; i--) {
    current_ext = parts[i] + (current_ext ? '.' + current_ext : '')
    extensions.push(current_ext)
  }

  return extensions
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export function should_ignore_file(
  file_path: string,
  ignored_extensions: Set<string>
): boolean {
  try {
    const stats = fs.statSync(file_path)
    if (stats.isFile() && stats.size > MAX_FILE_SIZE_BYTES) {
      return true
    }
  } catch (error) {
    // File doesn't exist or other error (e.g. broken symlink), treat as ignorable
    return true
  }

  const extensions = extract_extension_variations(file_path)
  return extensions.some((ext) => ignored_extensions.has(ext))
}

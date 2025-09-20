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

export function should_ignore_file(
  file_path: string,
  ignored_extensions: Set<string>
): boolean {
  const extensions = extract_extension_variations(file_path)
  return extensions.some((ext) => ignored_extensions.has(ext))
}

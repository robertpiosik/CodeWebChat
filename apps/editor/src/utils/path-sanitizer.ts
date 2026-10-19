import * as fs from 'fs'
import * as path from 'path'
import { normalize_path } from './normalize-path'

/**
 * Sanitizes a file or folder name to prevent path traversal attacks
 * but allows valid path segments separated by slashes
 *
 * @param name The raw name input from the user
 * @returns A sanitized version of the name with dangerous characters removed
 */
export const sanitize_file_name = (name: string): string => {
  if (name.includes('..')) {
    return ''
  }

  const segments = name.split(/[/\\]/)
  if (segments.some((seg) => seg === '.git')) {
    return ''
  }

  let sanitized = name.replace(/^[/\\]+/, '')

  sanitized = normalize_path(sanitized)

  return sanitized
}

/**
 * Ensures a path stays within its parent directory by validating the final path
 *
 * @param parent_path The parent directory path
 * @param file_name The filename to append (can include nested path segments)
 * @returns A safe file path or null if path traversal was detected
 */
export const create_safe_path = (
  parent_path: string,
  file_name: string
): string | null => {
  const sanitized_name = sanitize_file_name(file_name)
  if (!sanitized_name) {
    return null // Return null if sanitization results in empty string
  }

  let resolved_parent: string
  try {
    resolved_parent = fs.realpathSync(parent_path)
  } catch (err) {
    resolved_parent = path.resolve(parent_path)
  }

  const full_path = path.resolve(resolved_parent, sanitized_name)

  let current_path = full_path
  while (true) {
    try {
      const real_path = fs.realpathSync(current_path)
      const prefix = resolved_parent.endsWith(path.sep)
        ? resolved_parent
        : resolved_parent + path.sep
      if (real_path !== resolved_parent && !real_path.startsWith(prefix)) {
        return null
      }
      break
    } catch {
      const parent = path.dirname(current_path)
      if (parent === current_path) {
        break
      }
      current_path = parent
    }
  }

  const relative_path = path.relative(resolved_parent, full_path)

  if (relative_path.startsWith('..') || path.isAbsolute(relative_path)) {
    return null
  }

  return full_path
}

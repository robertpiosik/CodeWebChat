import * as path from 'path'

/**
 * Sanitizes a file or folder name to prevent path traversal attacks
 * but allows valid path segments separated by slashes
 *
 * @param name The raw name input from the user
 * @returns A sanitized version of the name with dangerous characters removed
 */
export const sanitize_file_name = (name: string): string => {
  // Remove path traversal sequences
  let sanitized = name.replace(/\.\.\//g, '').replace(/\.\.\\/g, '')

  // Remove leading slashes and backslashes to prevent absolute paths
  // but preserve leading dots for hidden files
  sanitized = sanitized.replace(/^[/\\]+/, '')

  // Convert Windows-style backslashes to forward slashes for consistency
  sanitized = sanitized.replace(/\\/g, '/')

  // Return the sanitized name, preserving valid path segments
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

  const full_path = path.join(parent_path, sanitized_name)

  // Verify the constructed path is still within the parent directory
  if (!full_path.startsWith(parent_path)) {
    return null
  }

  return full_path
}

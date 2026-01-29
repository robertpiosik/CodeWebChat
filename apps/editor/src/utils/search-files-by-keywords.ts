import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export const search_files_by_keywords = async (
  files: string[],
  keywords: string[],
  progress?: vscode.Progress<{ message?: string; increment?: number }>,
  token?: vscode.CancellationToken
): Promise<string[]> => {
  const matched_files: string[] = []
  const total = files.length
  let processed = 0
  const increment = total > 0 ? (1 / total) * 100 : 0

  for (const file_path of files) {
    if (token?.isCancellationRequested) break

    try {
      const file_name_lower = path.basename(file_path).toLowerCase()
      if (keywords.some((k) => file_name_lower.includes(k))) {
        matched_files.push(file_path)
        processed++
        progress?.report({
          increment,
          message: `${processed}/${total}`
        })
        continue
      }

      // Skip large files (> 1MB) to avoid performance issues
      const stats = await fs.promises.stat(file_path)
      if (stats.size > 1024 * 1024) {
        processed++
        progress?.report({
          increment,
          message: `${processed}/${total}`
        })
        continue
      }

      const content = await fs.promises.readFile(file_path, 'utf-8')
      const content_lower = content.toLowerCase()

      if (keywords.some((k) => content_lower.includes(k))) {
        matched_files.push(file_path)
      }
    } catch (error) {
      // Ignore read errors (binary files, permissions, etc.)
    }

    processed++
    progress?.report({
      increment,
      message: `${processed}/${total}`
    })
  }

  return matched_files
}

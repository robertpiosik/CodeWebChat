import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

export const search_files_by_keywords = async (
  files: string[],
  keyword_groups: string[][],
  progress?: vscode.Progress<{ message?: string; increment?: number }>,
  token?: vscode.CancellationToken
): Promise<string[]> => {
  const matched_files: string[] = []
  const total = files.length
  let processed = 0
  const increment = total > 0 ? (1 / total) * 100 : 0

  const matchers = keyword_groups.map((group) =>
    group.map((k) => {
      if (k.length >= 2 && k.startsWith('"') && k.endsWith('"')) {
        const term = k.slice(1, -1)
        if (!term) return () => false
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escaped}\\b`)
        return (text: string) => regex.test(text)
      }
      return (text: string) => text.includes(k)
    })
  )

  for (const file_path of files) {
    if (token?.isCancellationRequested) break

    try {
      const file_name_lower = path.basename(file_path).toLowerCase()
      if (
        matchers.some((group) => group.every((match) => match(file_name_lower)))
      ) {
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

      if (
        matchers.some((group) => group.every((match) => match(content_lower)))
      ) {
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

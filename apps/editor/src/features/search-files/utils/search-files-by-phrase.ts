import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { create_search_regex } from './create-search-regex'
import { IGNORED_LOCK_FILES } from '@/constants/ignored-lock-files'

export const search_files_by_phrase = async (params: {
  files: string[]
  search_term: string
  progress?: vscode.Progress<{ message?: string; increment?: number }>
  token?: vscode.CancellationToken
}): Promise<string[]> => {
  const matched_files: string[] = []
  const positive_regex = create_search_regex(params.search_term)

  let processed = 0
  for (const file_path of params.files) {
    if (params.token?.isCancellationRequested) break
    processed++

    if (params.progress && processed % 50 === 0) {
      params.progress.report({
        increment: (50 / params.files.length) * 100
      })
    }

    try {
      const file_name = path.basename(file_path)

      if (IGNORED_LOCK_FILES.includes(file_name)) {
        continue
      }

      const stats = await fs.promises.stat(file_path)
      if (stats.size > 1024 * 1024) continue

      const buffer = await fs.promises.readFile(file_path)
      const is_binary = buffer.includes(0)
      if (is_binary) continue

      const content = buffer.toString('utf-8')

      if (positive_regex.test(content)) {
        matched_files.push(file_path)
      }
    } catch (error) {
      Logger.error({
        function_name: 'search_files_by_phrase',
        message: `Error reading file during search: ${file_path}`,
        data: error
      })
    }
  }

  return matched_files
}

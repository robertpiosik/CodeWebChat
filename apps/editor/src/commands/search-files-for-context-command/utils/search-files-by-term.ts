import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'
import { create_search_regex } from './create-search-regex'

const IGNORED_FILES = new Set([
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock'
])

export const search_files_by_term = async (params: {
  files: string[]
  search_term: string
}): Promise<string[]> => {
  const matched_files: string[] = []
  const regex = create_search_regex(params.search_term)

  for (const file_path of params.files) {
    try {
      const file_name = path.basename(file_path)

      if (IGNORED_FILES.has(file_name)) {
        continue
      }

      if (regex.test(file_name)) {
        matched_files.push(file_path)
        continue
      }

      const stats = await fs.promises.stat(file_path)
      if (stats.size > 1024 * 1024) {
        continue
      }

      const content = await fs.promises.readFile(file_path, 'utf-8')

      if (regex.test(content)) {
        matched_files.push(file_path)
      }
    } catch (error) {
      Logger.error({
        function_name: 'search_files_by_term',
        message: `Error reading file during search: ${file_path}`,
        data: error
      })
    }
  }

  return matched_files
}

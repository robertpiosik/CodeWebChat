import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'
import { create_search_regex } from './create-search-regex'
import { IGNORED_LOCK_FILES } from '@/constants/ignored-lock-files'

export const search_files_by_term = async (params: {
  files: string[]
  search_term: string
  search_mode: 'phrase' | 'keywords' | 'intelligent'
}): Promise<string[]> => {
  const matched_files: string[] = []

  let regexes: RegExp[] = []
  if (params.search_mode === 'keywords') {
    const keywords = params.search_term
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    regexes = keywords.map((k) => create_search_regex(k))
  } else {
    regexes = [create_search_regex(params.search_term)]
  }

  if (regexes.length === 0) return []

  const matches_all = (text: string) => regexes.every((r) => r.test(text))

  for (const file_path of params.files) {
    try {
      const file_name = path.basename(file_path)

      if (IGNORED_LOCK_FILES.includes(file_name)) {
        continue
      }

      if (matches_all(file_name)) {
        matched_files.push(file_path)
        continue
      }

      const stats = await fs.promises.stat(file_path)
      if (stats.size > 1024 * 1024) {
        continue
      }

      const content = await fs.promises.readFile(file_path, 'utf-8')

      if (matches_all(content)) {
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

import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { IGNORED_LOCK_FILES } from '@/constants/ignored-lock-files'
import { check_matches_condition } from './check-matches-condition'
import { create_search_regex } from './create-search-regex'

export const search_files_by_keywords = async (params: {
  files: string[]
  search_term: string
  keywords_target?: 'contents' | 'filenames' | 'both'
  keywords_match_mode?: 'all' | 'some'
  progress?: vscode.Progress<{ message?: string; increment?: number }>
  token?: vscode.CancellationToken
}): Promise<string[]> => {
  const matched_files: string[] = []

  const keywords = (
    params.search_term.match(/(?:-?"[^"]*")|(?:-?[^\s,]+)/g) || []
  ).filter((k) => k.length > 0)

  const positive_keywords = keywords.filter((k) => !k.startsWith('-'))
  const negative_keywords = keywords
    .filter((k) => k.startsWith('-'))
    .map((k) => k.slice(1))

  const positive_regexes = positive_keywords.map((k) => create_search_regex(k))
  const negative_regexes = negative_keywords.map((k) => create_search_regex(k))

  if (positive_regexes.length == 0 && negative_regexes.length == 0) return []

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

      if (params.keywords_target == 'filenames') {
        if (
          check_matches_condition({
            text: file_name,
            positive_regexes,
            negative_regexes,
            match_mode: params.keywords_match_mode
          })
        ) {
          matched_files.push(file_path)
        }
        continue
      }

      const stats = await fs.promises.stat(file_path)
      let text_to_check = ''

      if (stats.size > 1024 * 1024) {
        if (params.keywords_target == 'both') {
          text_to_check = file_name
        } else {
          continue
        }
      } else {
        const buffer = await fs.promises.readFile(file_path)
        const is_binary = buffer.includes(0)

        if (is_binary) {
          if (params.keywords_target == 'both') {
            text_to_check = file_name
          } else {
            continue
          }
        } else {
          const content = buffer.toString('utf-8')
          if (params.keywords_target == 'both') {
            text_to_check = file_name + '\n' + content
          } else {
            text_to_check = content
          }
        }
      }

      if (
        check_matches_condition({
          text: text_to_check,
          positive_regexes,
          negative_regexes,
          match_mode: params.keywords_match_mode
        })
      ) {
        matched_files.push(file_path)
      }
    } catch (error) {
      Logger.error({
        function_name: 'search_files_by_keywords',
        message: `Error reading file during search: ${file_path}`,
        data: error
      })
    }
  }

  return matched_files
}

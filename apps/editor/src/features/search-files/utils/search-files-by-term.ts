import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import { exec } from 'child_process'
import { promisify } from 'util'
import { Logger } from '@shared/utils/logger'
import { create_search_regex } from './create-search-regex'
import { IGNORED_LOCK_FILES } from '@/constants/ignored-lock-files'
import { LIMIT_SEMANTIC_SEARCH_RESULTS } from '@/constants/values'

const exec_promise = promisify(exec)

const get_keyword_regexes = (search_term: string) => {
  const keywords = (
    search_term.match(/(?:-?"[^"]*")|(?:-?[^\s,]+)/g) || []
  ).filter((k) => k.length > 0)

  const positive_keywords = keywords.filter((k) => !k.startsWith('-'))
  const negative_keywords = keywords
    .filter((k) => k.startsWith('-'))
    .map((k) => k.slice(1))

  return {
    positive_regexes: positive_keywords.map((k) => create_search_regex(k)),
    negative_regexes: negative_keywords.map((k) => create_search_regex(k))
  }
}

const check_matches_condition = (params: {
  text: string
  positive_regexes: RegExp[]
  negative_regexes: RegExp[]
  match_mode?: 'all' | 'some'
}) => {
  if (params.negative_regexes.some((r) => r.test(params.text))) {
    return false
  }
  if (params.positive_regexes.length == 0) {
    return true
  }
  if (params.match_mode == 'some') {
    return params.positive_regexes.some((r) => r.test(params.text))
  }
  return params.positive_regexes.every((r) => r.test(params.text))
}

export const search_files_by_term = async (params: {
  files: string[]
  search_term: string
  search_mode: 'phrase' | 'keywords' | 'intelligent' | 'semantic'
  keywords_target?: 'contents' | 'filenames' | 'both'
  keywords_match_mode?: 'all' | 'some'
  progress?: vscode.Progress<{ message?: string; increment?: number }>
  token?: vscode.CancellationToken
}): Promise<string[]> => {
  const matched_files: string[] = []

  if (params.search_mode == 'semantic') {
    const workspace_folders = vscode.workspace.workspaceFolders
    if (!workspace_folders) return []

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const top_k =
      config.get<number>('limitSemanticSearchResults') ||
      LIMIT_SEMANTIC_SEARCH_RESULTS

    const matched_map = new Map<string, number | undefined>()

    for (const folder of workspace_folders) {
      if (params.token?.isCancellationRequested) break
      try {
        const safe_term = params.search_term.replace(/"/g, '\\"')
        const { stdout } = await exec_promise(
          `semble search "${safe_term}" "${folder.uri.fsPath}" --top-k ${top_k}`
        )

        const lines = stdout.split('\n')

        for (const file of params.files) {
          const relative_path = path.relative(folder.uri.fsPath, file)
          const matched_line = lines.find(
            (line) => line.includes(relative_path) || line.includes(file)
          )

          if (matched_line) {
            const score_match = matched_line.match(
              /\b(0\.\d+|1\.0+|\d+\.\d+)\b/
            )
            const score = score_match ? parseFloat(score_match[1]) : undefined
            matched_map.set(file, score)
          }
        }
      } catch (error) {
        Logger.error({
          function_name: 'search_files_by_term',
          message: `Error running semble search in ${folder.uri.fsPath}`,
          data: error
        })
      }
    }

    return Array.from(matched_map.entries())
      .map(([file_path, score]) => ({ file_path, score }))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map((item) => item.file_path)
  }

  if (
    params.search_mode == 'keywords' &&
    params.keywords_target == 'filenames'
  ) {
    const { positive_regexes, negative_regexes } = get_keyword_regexes(
      params.search_term
    )

    if (positive_regexes.length == 0 && negative_regexes.length == 0) return []

    for (const file_path of params.files) {
      if (params.token?.isCancellationRequested) break

      try {
        const file_name = path.basename(file_path)

        if (IGNORED_LOCK_FILES.includes(file_name)) {
          continue
        }

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

  let positive_regexes: RegExp[] = []
  let negative_regexes: RegExp[] = []

  if (params.search_mode == 'keywords') {
    const regexes = get_keyword_regexes(params.search_term)
    positive_regexes = regexes.positive_regexes
    negative_regexes = regexes.negative_regexes
  } else {
    positive_regexes = [create_search_regex(params.search_term)]
  }

  if (positive_regexes.length == 0 && negative_regexes.length == 0) return []

  const match_mode =
    params.search_mode == 'keywords' ? params.keywords_match_mode : undefined

  let processed = 0
  for (const file_path of params.files) {
    if (params.token?.isCancellationRequested) break
    processed++
    if (processed % 50 === 0) {
      params.progress?.report({
        increment: (50 / params.files.length) * 100
      })
    }

    try {
      const file_name = path.basename(file_path)

      if (IGNORED_LOCK_FILES.includes(file_name)) {
        continue
      }

      const stats = await fs.promises.stat(file_path)
      let text_to_check = ''

      if (stats.size > 1024 * 1024) {
        if (
          params.search_mode == 'keywords' &&
          params.keywords_target == 'both'
        ) {
          text_to_check = file_name
        } else {
          continue
        }
      } else {
        const buffer = await fs.promises.readFile(file_path)
        const is_binary = buffer.includes(0)

        if (is_binary) {
          if (
            params.search_mode == 'keywords' &&
            params.keywords_target == 'both'
          ) {
            text_to_check = file_name
          } else {
            continue
          }
        } else {
          const content = buffer.toString('utf-8')
          if (
            params.search_mode == 'keywords' &&
            params.keywords_target == 'both'
          ) {
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
          match_mode
        })
      ) {
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

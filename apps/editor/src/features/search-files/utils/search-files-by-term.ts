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

export const search_files_by_term = async (params: {
  files: string[]
  search_term: string
  search_mode: 'phrase' | 'keywords' | 'filename' | 'intelligent' | 'semantic'
  keywords_match_mode?: 'all' | 'some'
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

  if (params.search_mode == 'filename') {
    const keywords = params.search_term
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    const regexes = keywords.map((k) => create_search_regex(k))

    if (regexes.length == 0) return []

    const matches_condition = (text: string) => {
      if (params.keywords_match_mode == 'some') {
        return regexes.some((r) => r.test(text))
      }
      return regexes.every((r) => r.test(text))
    }

    for (const file_path of params.files) {
      try {
        const file_name = path.basename(file_path)

        if (IGNORED_LOCK_FILES.includes(file_name)) {
          continue
        }

        if (matches_condition(file_name)) {
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

  let regexes: RegExp[] = []
  if (params.search_mode == 'keywords') {
    const keywords = params.search_term
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    regexes = keywords.map((k) => create_search_regex(k))
  } else {
    regexes = [create_search_regex(params.search_term)]
  }

  if (regexes.length == 0) return []

  const matches_condition = (text: string) => {
    if (
      params.search_mode == 'keywords' &&
      params.keywords_match_mode == 'some'
    ) {
      return regexes.some((r) => r.test(text))
    }
    return regexes.every((r) => r.test(text))
  }

  for (const file_path of params.files) {
    try {
      const file_name = path.basename(file_path)

      if (IGNORED_LOCK_FILES.includes(file_name)) {
        continue
      }

      const stats = await fs.promises.stat(file_path)
      if (stats.size > 1024 * 1024) {
        continue
      }

      const content = await fs.promises.readFile(file_path, 'utf-8')

      if (matches_condition(content)) {
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

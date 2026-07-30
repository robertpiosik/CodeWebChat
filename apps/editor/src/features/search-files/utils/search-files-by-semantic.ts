import * as path from 'path'
import * as vscode from 'vscode'
import { exec } from 'child_process'
import { promisify } from 'util'
import { Logger } from '@shared/utils/logger'
import { LIMIT_SEMANTIC_SEARCH_RESULTS } from '@/constants/values'

const exec_promise = promisify(exec)

export const search_files_by_semantic = async (params: {
  files: string[]
  search_term: string
  progress?: vscode.Progress<{ message?: string; increment?: number }>
  token?: vscode.CancellationToken
}): Promise<string[]> => {
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
          const score_match = matched_line.match(/\b(0\.\d+|1\.0+|\d+\.\d+)\b/)
          const score = score_match ? parseFloat(score_match[1]) : undefined
          matched_map.set(file, score)
        }
      }
    } catch (error) {
      Logger.error({
        function_name: 'search_files_by_semantic',
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

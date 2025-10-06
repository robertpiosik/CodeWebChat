import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'
import { GitRepository } from '@/utils/git-repository-utils'
import { should_ignore_file } from '@/context/utils/should-ignore-file'
import { ignored_extensions } from '@/context/constants/ignored-extensions'

export interface FileData {
  path: string
  relative_path: string
  content: string
  estimated_tokens: number
  status: number
  is_large_file: boolean
}

export const get_ignored_extensions = (): Set<string> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_ignored_extensions = new Set(
    config
      .get<string[]>('ignoredExtensions', [])
      .map((ext) => ext.toLowerCase().replace(/^\./, ''))
  )
  return new Set([...ignored_extensions, ...config_ignored_extensions])
}

export const collect_affected_files_with_metadata = async (params: {
  repository: GitRepository
  ignored_extensions: Set<string>
}): Promise<FileData[]> => {
  const staged_files = params.repository.state.indexChanges || []
  const files_data: FileData[] = []

  for (const change of staged_files) {
    const file_path = change.uri.fsPath
    const relative_path = path.relative(
      params.repository.rootUri.fsPath,
      file_path
    )

    if (should_ignore_file(relative_path, params.ignored_extensions)) {
      continue
    }

    let content = ''
    let is_large_file = false
    try {
      const stats = await fs.promises.stat(file_path)
      if (stats.size > 100 * 1024) {
        is_large_file = true
        content = `File content omitted due to large size (${(
          stats.size / 1024
        ).toFixed(2)} KB).`
      } else {
        content = await fs.promises.readFile(file_path, 'utf8')
      }
    } catch (read_error) {
      Logger.warn({
        function_name: 'collect_affected_files_with_metadata',
        message: `Could not read file content for ${relative_path}`,
        data: read_error
      })
      content = `Could not read file content.`
    }

    // Simple token estimation: 1 token per 4 characters
    const estimated_tokens = Math.ceil(content.length / 4)

    files_data.push({
      path: file_path,
      relative_path: relative_path,
      content: content,
      estimated_tokens: estimated_tokens,
      status: change.status,
      is_large_file: is_large_file
    })
  }
  return files_data
}

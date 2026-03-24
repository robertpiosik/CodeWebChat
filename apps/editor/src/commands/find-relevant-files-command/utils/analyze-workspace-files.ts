import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { shrink_file } from '../../../context/utils/shrink-file/shrink-file'
import { t } from '@/i18n'

export interface FileData {
  file_path: string
  relative_path: string
  content: string
  shrunk_content: string
}

export interface FileAnalysisResult {
  full_tokens: number
  shrink_tokens: number
  files_data: FileData[]
  workspace_root: string
}

export const analyze_workspace_files = async (params: {
  workspace_provider: WorkspaceProvider
  folder_path: string
}): Promise<FileAnalysisResult> => {
  const all_files = await params.workspace_provider.find_all_files(
    params.folder_path
  )
  const workspace_root =
    params.workspace_provider.get_workspace_root_for_file(params.folder_path) ||
    params.folder_path

  let full_tokens = 0
  let shrink_tokens = 0
  const files_data: FileData[] = []

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: t('command.find-relevant-files.progress.analyzing')
    },
    async () => {
      for (const file_path of all_files) {
        try {
          const stats = await fs.promises.stat(file_path)
          if (stats.size > 1024 * 1024) continue

          const content = await fs.promises.readFile(file_path, 'utf8')
          const shrunk_content = shrink_file(content, path.extname(file_path))
          const relative_path = path.relative(workspace_root, file_path)

          files_data.push({ file_path, relative_path, content, shrunk_content })

          const token_count =
            await params.workspace_provider.calculate_file_tokens(file_path)
          full_tokens += token_count.total
          shrink_tokens += token_count.shrink
        } catch (e) {}
      }
    }
  )

  return { full_tokens, shrink_tokens, files_data, workspace_root }
}

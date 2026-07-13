import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { shrink_file } from '@/context/utils/shrink-file/shrink-file'
import { t } from '@/i18n'

export interface FileData {
  file_path: string
  display_path: string
  content: string
  shrunk_content: string
}

export interface FileAnalysisResult {
  full_tokens: number
  shrink_tokens: number
  files_data: FileData[]
}

export const analyze_files = async (params: {
  workspace_provider: WorkspaceProvider
  files: string[]
}): Promise<FileAnalysisResult> => {
  let full_tokens = 0
  let shrink_tokens = 0
  const files_data: FileData[] = []

  const multiple_roots =
    params.workspace_provider.get_workspace_roots().length > 1

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: t('command.search.progress.analyzing')
    },
    async () => {
      for (const file_path of params.files) {
        try {
          const stats = await fs.promises.stat(file_path)
          if (stats.size > 1024 * 1024) continue

          const content = await fs.promises.readFile(file_path, 'utf8')
          const shrunk_content = shrink_file(content, path.extname(file_path))

          const workspace_root =
            params.workspace_provider.get_workspace_root_for_file(file_path)
          const relative_path = workspace_root
            ? path.relative(workspace_root, file_path)
            : file_path

          let display_path = relative_path
          if (multiple_roots && workspace_root) {
            const workspace_name =
              params.workspace_provider.get_workspace_name(workspace_root)
            display_path = `${workspace_name}/${relative_path}`
          }

          files_data.push({ file_path, display_path, content, shrunk_content })

          const token_count =
            await params.workspace_provider.calculate_file_tokens(file_path)
          full_tokens += token_count.total
          shrink_tokens += token_count.shrink
        } catch (e) {}
      }
    }
  )

  return { full_tokens, shrink_tokens, files_data }
}

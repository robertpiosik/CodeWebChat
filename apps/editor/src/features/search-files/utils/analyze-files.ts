import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { shrink_file } from './shrink-file'
import { t } from '@/i18n'

export interface FileData {
  file_path: string
  display_path: string
  content: string
}

export interface FileAnalysisResult {
  full_tokens: number
  shrink_tokens: number
  files_data: FileData[]
}

export const analyze_files = async (params: {
  workspace_provider: WorkspaceProvider
  files: string[]
  get_file_content?: (file_path: string) => Promise<string | undefined>
}): Promise<FileAnalysisResult> => {
  let full_tokens = 0
  let shrink_tokens = 0
  const files_data: FileData[] = []

  const multiple_roots =
    params.workspace_provider.get_workspace_roots().length > 1

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: t('feature.search-files.progress.analyzing')
    },
    async () => {
      for (const file_path of params.files) {
        try {
          let content: string | undefined
          if (params.get_file_content) {
            content = await params.get_file_content(file_path)
          }

          if (content === undefined) {
            const stats = await fs.promises.stat(file_path)
            if (stats.size > 1024 * 1024) continue

            const buffer = await fs.promises.readFile(file_path)
            if (buffer.includes(0)) continue

            content = buffer.toString('utf8')
          }

          const range = params.workspace_provider.get_range(file_path)
          if (range) {
            content = params.workspace_provider.apply_range_to_content(
              content,
              range
            )
          }

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

          files_data.push({ file_path, display_path, content })

          const backticks_full = content.includes('```') ? '````' : '```'
          const wrapped_full = `### File: \`${display_path}\`\n\n${backticks_full}\n${content}\n${backticks_full}\n\n`
          full_tokens += Math.floor(wrapped_full.length / 4)

          const backticks_shrunk = shrunk_content.includes('```')
            ? '````'
            : '```'
          const wrapped_shrunk = `### File: \`${display_path}\`\n\n${backticks_shrunk}\n${shrunk_content}\n${backticks_shrunk}\n\n`
          shrink_tokens += Math.floor(wrapped_shrunk.length / 4)
        } catch (e) {}
      }
    }
  )

  return { full_tokens, shrink_tokens, files_data }
}

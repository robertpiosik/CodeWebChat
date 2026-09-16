import * as vscode from 'vscode'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'

export const read_rename_source_file = async (params: {
  renamed_from: string
  workspace_root: string
}): Promise<{ path: string; content: string } | undefined> => {
  const sanitized_rename_path = sanitize_file_name(params.renamed_from)
  const safe_rename_path = create_safe_path(
    params.workspace_root,
    sanitized_rename_path
  )

  if (safe_rename_path && fs.existsSync(safe_rename_path)) {
    try {
      const document = await vscode.workspace.openTextDocument(safe_rename_path)
      return {
        path: safe_rename_path,
        content: document.getText()
      }
    } catch (e) {
      Logger.warn({
        function_name: 'read_rename_source_file',
        message: 'Failed to read rename source file',
        data: safe_rename_path
      })
    }
  }
  return undefined
}

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'
import { FileItem } from '../utils/clipboard-parser'
import { OriginalFileState } from '../types/original-file-state'
import { process_truncated_content } from '../utils/edit-formats/truncations'

export const handle_truncated_edit = async (
  files: FileItem[]
): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  failed_files?: FileItem[]
}> => {
  Logger.info({
    function_name: 'handle_truncated_edit',
    message: 'start',
    data: { file_count: files.length }
  })

  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_WORKSPACE_FOLDER_OPEN
    )
    return { success: false }
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  const original_states: OriginalFileState[] = []
  const failed_files: FileItem[] = []

  for (const file of files) {
    let workspace_root = default_workspace
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    }

    const sanitized_path = sanitize_file_name(file.file_path)
    const safe_path = create_safe_path(workspace_root, sanitized_path)

    if (!safe_path) {
      Logger.warn({
        function_name: 'handle_truncated_edit',
        message: 'Unsafe file path detected',
        data: file.file_path
      })
      continue
    }

    if (!fs.existsSync(safe_path)) {
      // Cannot fill truncations for a file that doesn't exist
      failed_files.push(file)
      Logger.warn({
        function_name: 'handle_truncated_edit',
        message: 'File not found for truncated edit',
        data: safe_path
      })
      continue
    }

    try {
      const document = await vscode.workspace.openTextDocument(safe_path)
      const original_content = document.getText()
      const new_content = process_truncated_content(
        file.content,
        original_content
      )

      const directory = path.dirname(safe_path)
      if (!fs.existsSync(directory)) {
        await fs.promises.mkdir(directory, { recursive: true })
      }

      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(safe_path),
        Buffer.from(new_content, 'utf8')
      )

      original_states.push({
        file_path: file.file_path,
        content: original_content,
        workspace_name: file.workspace_name,
        ai_content: file.content,
        proposed_content: new_content
      })

      Logger.info({
        function_name: 'handle_truncated_edit',
        message: 'Applied truncated edit',
        data: safe_path
      })
    } catch (error: any) {
      Logger.error({
        function_name: 'handle_truncated_edit',
        message: 'Failed to process truncated file',
        data: { error: error.message, file_path: safe_path }
      })
      failed_files.push(file)
    }
  }

  return { success: true, original_states, failed_files }
}

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import { FileItem } from '../response-parser'
import { get_rename_source_info } from './get-rename-source-info'
import { cleanup_rename_source } from './cleanup-rename-source'
import { close_file_tabs } from './close-file-tabs'
import { remove_directory_if_empty } from './remove-directory-if-empty'

export const handle_deleted_file_item = async (params: {
  file: FileItem
  safe_path: string
  workspace_root: string
  workspace_map: Map<string, string>
  default_workspace: string
  function_name: string
}): Promise<{ success: boolean; original_state?: OriginalFileState }> => {
  await get_rename_source_info({
    file: params.file,
    workspace_map: params.workspace_map,
    default_workspace: params.default_workspace
  }).then(async (info) => {
    if (info.rename_source_path && info.rename_source_workspace_root) {
      await cleanup_rename_source({
        source_path: info.rename_source_path,
        workspace_root: info.rename_source_workspace_root
      })
    }
  })

  let original_content = ''
  if (fs.existsSync(params.safe_path)) {
    try {
      const document = await vscode.workspace.openTextDocument(params.safe_path)
      original_content = document.getText()

      await close_file_tabs(params.safe_path)

      await vscode.workspace.fs.delete(vscode.Uri.file(params.safe_path))
      await remove_directory_if_empty({
        dir_path: path.dirname(params.safe_path),
        workspace_root: params.workspace_root
      })

      Logger.info({
        function_name: params.function_name,
        message: 'File deleted',
        data: params.safe_path
      })
    } catch (error: any) {
      Logger.error({
        function_name: params.function_name,
        message: 'Failed to delete file',
        data: { error: error.message || error, file_path: params.safe_path }
      })
      return { success: false }
    }
  }

  const original_state: OriginalFileState = {
    file_path: params.file.file_path,
    content: original_content,
    workspace_name: params.file.workspace_name,
    file_state: 'deleted',
    ai_content: params.file.content,
    proposed_content: ''
  }

  return { success: true, original_state }
}

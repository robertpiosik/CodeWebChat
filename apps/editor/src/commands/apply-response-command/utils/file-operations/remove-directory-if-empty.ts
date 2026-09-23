import * as path from 'path'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { uri_exists } from './uri-exists'

export const remove_directory_if_empty = async (params: {
  dir_path: string
  workspace_root: string
}) => {
  const normalized_dir = path.normalize(params.dir_path)
  const normalized_root = path.normalize(params.workspace_root)

  if (
    !normalized_dir ||
    !normalized_dir.startsWith(normalized_root) ||
    normalized_dir == normalized_root
  ) {
    return
  }

  try {
    const dir_uri = vscode.Uri.file(normalized_dir)
    if (await uri_exists(dir_uri)) {
      const stat = await vscode.workspace.fs.stat(dir_uri)
      if (stat.type === vscode.FileType.Directory) {
        const files = await vscode.workspace.fs.readDirectory(dir_uri)
        if (files.length == 0) {
          await vscode.workspace.fs.delete(dir_uri)
          Logger.info({
            function_name: 'remove_directory_if_empty',
            message: 'Removed empty directory',
            data: { dir_path: normalized_dir }
          })
          await remove_directory_if_empty({
            dir_path: path.dirname(normalized_dir),
            workspace_root: params.workspace_root
          })
        }
      }
    }
  } catch (error) {
    Logger.error({
      function_name: 'remove_directory_if_empty',
      message: 'Error removing empty directory',
      data: { error, dir_path: normalized_dir }
    })
  }
}

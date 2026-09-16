import * as vscode from 'vscode'
import * as path from 'path'
import { close_file_tabs } from './close-file-tabs'
import { remove_directory_if_empty } from './remove-directory-if-empty'

export const cleanup_rename_source = async (params: {
  source_path: string
  workspace_root: string
}) => {
  await close_file_tabs(params.source_path)
  await vscode.workspace.fs.delete(vscode.Uri.file(params.source_path))
  await remove_directory_if_empty({
    dir_path: path.dirname(params.source_path),
    workspace_root: params.workspace_root
  })
}

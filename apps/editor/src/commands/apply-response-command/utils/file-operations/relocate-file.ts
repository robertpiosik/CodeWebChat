import * as path from 'path'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { create_safe_path } from '@/utils/path-sanitizer'
import { uri_exists } from './uri-exists'
import { remove_directory_if_empty } from './remove-directory-if-empty'
import { close_file_tabs } from './close-file-tabs'
import { ensure_directory_exists } from './ensure-directory'

export const relocate_file = async (params: {
  old_path: string
  new_path: string
  old_workspace_root: string
  new_workspace_root: string
}): Promise<boolean> => {
  try {
    const old_safe_path = create_safe_path(
      params.old_workspace_root,
      params.old_path
    )
    const new_safe_path = create_safe_path(
      params.new_workspace_root,
      params.new_path
    )

    if (!old_safe_path || !new_safe_path) {
      Logger.error({
        function_name: 'relocate_file',
        message: 'Invalid file paths for relocation',
        data: { old_path: params.old_path, new_path: params.new_path }
      })
      return false
    }

    const old_uri = vscode.Uri.file(old_safe_path)
    if (!(await uri_exists(old_uri))) {
      Logger.warn({
        function_name: 'relocate_file',
        message: 'Source file does not exist for relocation',
        data: { old_path: old_safe_path }
      })
      return false
    }

    const new_uri = vscode.Uri.file(new_safe_path)
    await ensure_directory_exists(new_safe_path)

    await close_file_tabs(old_safe_path)

    await vscode.workspace.fs.rename(old_uri, new_uri, { overwrite: true })

    await remove_directory_if_empty({
      dir_path: path.dirname(old_safe_path),
      workspace_root: params.old_workspace_root
    })

    Logger.info({
      function_name: 'relocate_file',
      message: 'File successfully relocated',
      data: { old_path: old_safe_path, new_path: new_safe_path }
    })

    return true
  } catch (error) {
    Logger.error({
      function_name: 'relocate_file',
      message: 'Error relocating file',
      data: { error, old_path: params.old_path, new_path: params.new_path }
    })
    return false
  }
}

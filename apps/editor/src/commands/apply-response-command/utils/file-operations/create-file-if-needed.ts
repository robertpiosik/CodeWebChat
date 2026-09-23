import * as path from 'path'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { create_safe_path } from '@/utils/path-sanitizer'
import { uri_exists } from './uri-exists'
import {
  get_workspace_map_and_default,
  resolve_workspace_root
} from '../workspace'

export const create_file_if_needed = async (params: {
  file_path: string
  content: string
  workspace_name?: string
}): Promise<boolean> => {
  Logger.info({
    function_name: 'create_file_if_needed',
    message: 'start',
    data: { filePath: params.file_path, workspace_name: params.workspace_name }
  })
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    vscode.window.showErrorMessage(
      t('command.apply-response-command.error.no-workspace-folder')
    )
    Logger.warn({
      function_name: 'create_file_if_needed',
      message: 'No workspace folder open.'
    })
    return false
  }

  const { workspace_map, default_workspace } = get_workspace_map_and_default()

  const workspace_folder_path = resolve_workspace_root({
    workspace_name: params.workspace_name,
    workspace_map,
    default_workspace,
    file_path: params.file_path,
    function_name: 'create_file_if_needed'
  })

  const safe_path = create_safe_path(workspace_folder_path, params.file_path)

  if (!safe_path) {
    vscode.window.showErrorMessage(
      t('command.apply-response-command.error.invalid-file-path-traversal', {
        path: params.file_path
      })
    )
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Invalid file path',
      data: params.file_path
    })
    return false
  }
  const file_uri = vscode.Uri.file(safe_path)
  const directory_uri = vscode.Uri.file(path.dirname(safe_path))

  if (!(await uri_exists(directory_uri))) {
    try {
      await vscode.workspace.fs.createDirectory(directory_uri)
      Logger.info({
        function_name: 'create_file_if_needed',
        message: 'Directory created',
        data: directory_uri.fsPath
      })
    } catch (error) {
      Logger.error({
        function_name: 'create_file_if_needed',
        message: 'Failed to create directory',
        data: { directory: directory_uri.fsPath, error }
      })
      vscode.window.showErrorMessage(
        t('command.apply-response-command.error.failed-to-create-directory', {
          path: directory_uri.fsPath
        })
      )
      return false
    }
  }

  try {
    await vscode.workspace.fs.writeFile(
      file_uri,
      Buffer.from(params.content, 'utf8')
    )
    Logger.info({
      function_name: 'create_file_if_needed',
      message: 'File created',
      data: safe_path
    })
    return true
  } catch (error) {
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Failed to write file',
      data: { safe_path, error }
    })
    vscode.window.showErrorMessage(
      t('command.apply-response-command.error.failed-to-write-file', {
        path: safe_path
      })
    )
  }
  return false
}

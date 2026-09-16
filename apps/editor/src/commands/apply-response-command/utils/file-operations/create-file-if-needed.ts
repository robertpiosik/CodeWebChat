import * as vscode from 'vscode'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { create_safe_path } from '@/utils/path-sanitizer'
import { uri_exists } from './uri-exists'

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
      t('command.apply-response.error.no-workspace-folder')
    )
    Logger.warn({
      function_name: 'create_file_if_needed',
      message: 'No workspace folder open.'
    })
    return false
  }

  let workspace_folder_path: string | undefined

  if (params.workspace_name) {
    const target_workspace = vscode.workspace.workspaceFolders.find(
      (folder) => folder.name == params.workspace_name
    )
    if (target_workspace) {
      workspace_folder_path = target_workspace.uri.fsPath
    } else {
      Logger.warn({
        function_name: 'create_file_if_needed',
        message: `Workspace named "${params.workspace_name}" not found. Falling back to the first workspace.`,
        data: params.file_path
      })
      workspace_folder_path = vscode.workspace.workspaceFolders[0].uri.fsPath
    }
  } else {
    workspace_folder_path = vscode.workspace.workspaceFolders[0].uri.fsPath
  }

  const safe_path = create_safe_path(workspace_folder_path, params.file_path)

  if (!safe_path) {
    vscode.window.showErrorMessage(
      t('command.apply-response.error.invalid-file-path-traversal', {
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
        t('command.apply-response.error.failed-to-create-directory', {
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
      t('command.apply-response.error.failed-to-write-file', {
        path: safe_path
      })
    )
  }
  return false
}

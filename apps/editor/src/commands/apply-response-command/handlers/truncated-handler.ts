import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'
import { FileItem } from '../utils/clipboard-parser'
import { OriginalFileState } from '../types/original-file-state'
import { process_truncated_content } from '../utils/edit-formats/truncations'
import {
  read_rename_source_file,
  cleanup_rename_source
} from '../utils/file-operations'

export const handle_truncated_edit = async (params: {
  files: FileItem[]
  on_progress: (progress: number) => void
}): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  failed_files?: FileItem[]
}> => {
  Logger.info({
    function_name: 'handle_truncated_edit',
    message: 'start',
    data: { file_count: params.files.length }
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

  const total_files = params.files.length
  for (let i = 0; i < total_files; i++) {
    params.on_progress(Math.round((i / total_files) * 100))
    const file = params.files[i]
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

    let rename_source_path: string | undefined
    let rename_source_content: string | undefined
    let rename_source_workspace_root: string | undefined

    if (file.renamed_from) {
      let old_workspace_root = default_workspace
      if (
        file.renamed_from_workspace &&
        workspace_map.has(file.renamed_from_workspace)
      ) {
        old_workspace_root = workspace_map.get(file.renamed_from_workspace)!
      }

      const source_info = await read_rename_source_file({
        renamed_from: file.renamed_from,
        workspace_root: old_workspace_root
      })
      if (source_info) {
        rename_source_path = source_info.path
        rename_source_content = source_info.content
        rename_source_workspace_root = old_workspace_root
      }
    }

    if (
      rename_source_path &&
      rename_source_content !== undefined &&
      rename_source_workspace_root
    ) {
      try {
        const new_content = process_truncated_content(
          file.content,
          rename_source_content
        )

        await cleanup_rename_source({
          source_path: rename_source_path,
          workspace_root: rename_source_workspace_root
        })

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
          content: rename_source_content,
          workspace_name: file.workspace_name,
          file_path_to_restore: file.renamed_from,
          restore_workspace_name: file.renamed_from_workspace,
          ai_content: file.content,
          proposed_content: new_content
        })

        Logger.info({
          function_name: 'handle_truncated_edit',
          message: 'Applied truncated edit',
          data: safe_path
        })
        continue
      } catch (error: any) {
        Logger.error({
          function_name: 'handle_truncated_edit',
          message: 'Failed to process truncated file for rename',
          data: { error: error.message, file_path: safe_path }
        })
        failed_files.push(file)
        continue
      }
    }

    if (!fs.existsSync(safe_path)) {
      try {
        const directory = path.dirname(safe_path)
        if (!fs.existsSync(directory)) {
          await fs.promises.mkdir(directory, { recursive: true })
        }

        const new_content = process_truncated_content(file.content, '')

        await fs.promises.writeFile(safe_path, new_content, 'utf8')

        original_states.push({
          file_path: file.file_path,
          content: '',
          file_state: 'new',
          workspace_name: file.workspace_name,
          ai_content: file.content,
          proposed_content: new_content
        })
      } catch (error: any) {
        Logger.error({
          function_name: 'handle_truncated_edit',
          message: 'Failed to create new file',
          data: { error: error.message, file_path: safe_path }
        })
        failed_files.push(file)
      }
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

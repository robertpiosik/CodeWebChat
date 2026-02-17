import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'
import { FileItem } from '../utils/clipboard-parser'
import { OriginalFileState } from '../types/original-file-state'
import { remove_directory_if_empty } from '../utils/file-operations'
import { apply_conflict_markers_to_content } from '../utils/edit-formats/conflict-markers/apply-conflict-markers-to-content'
import { parse_conflict_segments } from '../utils/edit-formats/conflict-markers'

export const handle_conflict_markers = async (
  files: FileItem[]
): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  failed_files?: FileItem[]
}> => {
  Logger.info({
    function_name: 'handle_conflict_markers',
    message: 'start',
    data: { file_count: files.length }
  })
  try {
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
          function_name: 'handle_conflict_markers',
          message: 'Unsafe file path detected',
          data: file.file_path
        })
        continue
      }

      const file_exists = fs.existsSync(safe_path)
      const has_markers =
        file.content.includes('<<<<<<<') &&
        file.content.includes('=======') &&
        file.content.includes('>>>>>>>')

      let rename_source_path: string | undefined
      let rename_source_content: string | undefined

      if (file.renamed_from) {
        const sanitized_rename_path = sanitize_file_name(file.renamed_from)
        const safe_rename_path = create_safe_path(
          workspace_root,
          sanitized_rename_path
        )
        if (safe_rename_path && fs.existsSync(safe_rename_path)) {
          rename_source_path = safe_rename_path
          try {
            const document =
              await vscode.workspace.openTextDocument(safe_rename_path)
            rename_source_content = document.getText()
          } catch (e) {
            Logger.warn({
              function_name: 'handle_conflict_markers',
              message: 'Failed to read rename source file',
              data: safe_rename_path
            })
          }
        }
      }

      if (rename_source_path && rename_source_content !== undefined) {
        try {
          let new_content = rename_source_content
          if (has_markers) {
            new_content = apply_conflict_markers_to_content({
              original_content: rename_source_content,
              markers_content: file.content
            })
          } else {
            new_content = file.content
          }

          const tabs_to_close: vscode.Tab[] = []
          for (const tab_group of vscode.window.tabGroups.all) {
            tabs_to_close.push(
              ...tab_group.tabs.filter((tab) => {
                const tab_uri = (tab.input as any)?.uri as
                  | vscode.Uri
                  | undefined
                return tab_uri && tab_uri.fsPath === rename_source_path
              })
            )
          }

          if (tabs_to_close.length > 0) {
            await vscode.window.tabGroups.close(tabs_to_close)
          }

          await vscode.workspace.fs.delete(vscode.Uri.file(rename_source_path))
          await remove_directory_if_empty({
            dir_path: path.dirname(rename_source_path),
            workspace_root
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
            ai_content: file.content,
            proposed_content: new_content
          })
        } catch (error) {
          failed_files.push(file)
        }
      } else if (file_exists && has_markers) {
        try {
          const document = await vscode.workspace.openTextDocument(safe_path)
          const original_content = document.getText()
          const current_content = apply_conflict_markers_to_content({
            original_content,
            markers_content: file.content
          })

          if (current_content !== original_content) {
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(safe_path),
              Buffer.from(current_content, 'utf8')
            )
          }

          original_states.push({
            file_path: file.file_path,
            content: original_content,
            workspace_name: file.workspace_name,
            ai_content: file.content,
            proposed_content: current_content
          })

          Logger.info({
            function_name: 'handle_conflict_markers',
            message: 'Applied conflict markers edit to file',
            data: safe_path
          })
        } catch (error: any) {
          Logger.error({
            function_name: 'handle_conflict_markers',
            message: 'Failed to apply conflict markers edit',
            data: { file_path: safe_path, error }
          })
          failed_files.push(file)
        }
      } else if (!file_exists) {
        try {
          const directory = path.dirname(safe_path)
          if (!fs.existsSync(directory)) {
            await fs.promises.mkdir(directory, { recursive: true })
          }

          let content_to_write = file.content
          if (has_markers) {
            const segments = parse_conflict_segments(file.content)
            content_to_write = segments
              .map((s) =>
                s.type == 'common'
                  ? s.lines.join('\n')
                  : s.updated_lines.join('\n')
              )
              .join('\n')
          }

          await fs.promises.writeFile(safe_path, content_to_write, 'utf8')

          original_states.push({
            file_path: file.file_path,
            content: '',
            file_state: 'new',
            workspace_name: file.workspace_name,
            proposed_content: content_to_write
          })
        } catch (error) {
          failed_files.push(file)
        }
      } else if (file_exists && !has_markers) {
        try {
          const document = await vscode.workspace.openTextDocument(safe_path)
          const original_content = document.getText()

          let final_content = file.content
          if (
            original_content.endsWith('\n') &&
            !final_content.endsWith('\n')
          ) {
            final_content += '\n'
          }
          const edit = new vscode.WorkspaceEdit()
          edit.replace(
            document.uri,
            new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            ),
            final_content
          )
          await vscode.workspace.applyEdit(edit)
          await document.save()

          original_states.push({
            file_path: file.file_path,
            content: original_content,
            workspace_name: file.workspace_name,
            ai_content: file.content,
            proposed_content: final_content
          })
        } catch (error: any) {
          Logger.error({
            function_name: 'handle_conflict_markers',
            message: 'Error replacing file content (fallback)',
            data: { error, file_path: safe_path }
          })
          failed_files.push(file)
        }
      }
    }

    return { success: true, original_states, failed_files }
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_conflict_markers',
      message: 'Error during conflict markers edit',
      data: error
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_APPLYING_CHANGES(
        error.message || 'Unknown error'
      )
    )
    return { success: false }
  }
}

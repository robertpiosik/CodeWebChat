import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'
import { FileItem } from '../utils/clipboard-parser'
import { OriginalFileState } from '../types/original-file-state'
import { remove_directory_if_empty } from '../utils/file-operations'

type Segment =
  | { type: 'common'; lines: string[] }
  | { type: 'conflict'; original_lines: string[]; updated_lines: string[] }

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
            new_content = apply_conflict_markers_to_content(
              rename_source_content,
              file.content
            )
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
            file_path_to_restore: file.renamed_from
          })
        } catch (error) {
          failed_files.push(file)
        }
      } else if (file_exists && has_markers) {
        try {
          const document = await vscode.workspace.openTextDocument(safe_path)
          const original_content = document.getText()
          const current_content = apply_conflict_markers_to_content(
            original_content,
            file.content
          )

          if (current_content !== original_content) {
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(safe_path),
              Buffer.from(current_content, 'utf8')
            )
          }

          original_states.push({
            file_path: file.file_path,
            content: original_content,
            workspace_name: file.workspace_name
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
            workspace_name: file.workspace_name
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
            workspace_name: file.workspace_name
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

const parse_conflict_segments = (content: string): Segment[] => {
  const lines = content.split('\n')
  const segments: Segment[] = []
  let current_lines: string[] = []

  let state: 'NORMAL' | 'ORIGINAL' | 'UPDATED' = 'NORMAL'

  let original_buffer: string[] = []
  let updated_buffer: string[] = []

  for (const line of lines) {
    if (line.trim().startsWith('<<<<<<<')) {
      if (state == 'NORMAL') {
        if (current_lines.length > 0) {
          segments.push({ type: 'common', lines: [...current_lines] })
          current_lines = []
        }
        state = 'ORIGINAL'
        original_buffer = []
        updated_buffer = []
      } else {
        if (state == 'ORIGINAL') original_buffer.push(line)
        if (state == 'UPDATED') updated_buffer.push(line)
      }
      continue
    }

    if (line.trim().startsWith('=======')) {
      if (state == 'ORIGINAL') {
        state = 'UPDATED'
      } else if (state == 'NORMAL') {
        current_lines.push(line)
      } else {
        updated_buffer.push(line)
      }
      continue
    }

    if (line.trim().startsWith('>>>>>>>')) {
      if (state == 'UPDATED') {
        segments.push({
          type: 'conflict',
          original_lines: original_buffer,
          updated_lines: updated_buffer
        })
        state = 'NORMAL'
        original_buffer = []
        updated_buffer = []
      } else if (state == 'ORIGINAL') {
        segments.push({
          type: 'conflict',
          original_lines: original_buffer,
          updated_lines: []
        })
        state = 'NORMAL'
        original_buffer = []
        updated_buffer = []
      } else {
        current_lines.push(line)
      }
      continue
    }

    if (state == 'NORMAL') {
      current_lines.push(line)
    } else if (state == 'ORIGINAL') {
      original_buffer.push(line)
    } else if (state == 'UPDATED') {
      updated_buffer.push(line)
    }
  }

  if (state == 'NORMAL' && current_lines.length > 0) {
    segments.push({ type: 'common', lines: current_lines })
  }

  return segments
}

const apply_conflict_markers_to_content = (
  original_content: string,
  markers_content: string
): string => {
  let current_content = original_content
  const segments = parse_conflict_segments(markers_content)
  let cursor = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (segment.type == 'conflict') {
      const prev = i > 0 ? segments[i - 1] : undefined
      const next = i < segments.length - 1 ? segments[i + 1] : undefined

      const context_before = prev && prev.type == 'common' ? prev.lines : []
      const context_after = next && next.type == 'common' ? next.lines : []

      const search_lines = [
        ...context_before,
        ...segment.original_lines,
        ...context_after
      ]
      const search_text = search_lines.join('\n')

      const replace_lines = [
        ...context_before,
        ...segment.updated_lines,
        ...context_after
      ]
      const replace_text = replace_lines.join('\n')

      const index = current_content.indexOf(search_text, cursor)

      if (index == -1) {
        throw new Error(
          `Could not find content to replace for conflict marker. Context:\n${search_text.slice(0, 100)}...`
        )
      }

      current_content =
        current_content.slice(0, index) +
        replace_text +
        current_content.slice(index + search_text.length)

      // Advance cursor to skip the replaced part, but ensure we are positioned
      // to match the 'context_after' which serves as 'context_before' for the next segment.
      const unique_replaced_lines = [
        ...context_before,
        ...segment.updated_lines
      ]
      const unique_replaced_text = unique_replaced_lines.join('\n')

      let advance = unique_replaced_text.length
      if (context_after.length > 0 && unique_replaced_lines.length > 0) {
        advance += 1 // Account for newline joining unique part and context_after
      }

      cursor = index + advance
    }
  }
  return current_content
}

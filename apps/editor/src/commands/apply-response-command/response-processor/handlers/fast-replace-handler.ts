import * as fs from 'fs'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'
import { t } from '@/i18n'
import { FileItem } from '../../utils/response-parser'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import {
  get_workspace_map_and_default,
  resolve_workspace_root
} from '../../utils/workspace'
import { get_error_message } from '@/utils/get-error-message'
import {
  handle_deleted_file_item,
  relocate_file,
  replace_document_content,
  preserve_trailing_newline,
  ensure_directory_exists,
  prepare_rename_operation
} from '../../utils/file-operations'

export const handle_fast_replace = async (params: {
  files: FileItem[]
  on_progress: (progress: number) => void
}): Promise<{ success: boolean; original_states?: OriginalFileState[] }> => {
  Logger.info({
    function_name: 'handle_fast_replace',
    message: 'start',
    data: { file_count: params.files.length }
  })
  try {
    const safe_files: FileItem[] = []
    const unsafe_files: string[] = []

    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      vscode.window.showErrorMessage(
        t('command.apply-response-command.error.no-workspace-folder')
      )
      Logger.warn({
        function_name: 'handle_fast_replace',
        message: 'No workspace folder open.'
      })
      return { success: false }
    }

    const { workspace_map, default_workspace } = get_workspace_map_and_default()

    for (const file of params.files) {
      const workspace_root = resolve_workspace_root({
        workspace_name: file.workspace_name,
        workspace_map,
        default_workspace,
        file_path: file.file_path,
        function_name: 'handle_fast_replace'
      })

      const sanitized_path = sanitize_file_name(file.file_path)

      if (create_safe_path(workspace_root, sanitized_path)) {
        safe_files.push({
          ...file,
          file_path: sanitized_path
        })
      } else {
        unsafe_files.push(file.file_path)
        Logger.warn({
          function_name: 'handle_fast_replace',
          message: 'Unsafe file path detected',
          data: file.file_path
        })
      }
    }

    if (unsafe_files.length > 0) {
      const unsafe_list = unsafe_files.join('\n')
      vscode.window.showErrorMessage(
        t('command.apply-response-command.error.unsafe-file-paths-skipped', {
          count: unsafe_files.length,
          list: unsafe_list
        })
      )
      Logger.warn({
        function_name: 'handle_fast_replace',
        message: 'Unsafe file paths detected and skipped',
        data: unsafe_files
      })

      if (safe_files.length === 0) {
        return { success: false }
      }
    }

    const original_states: OriginalFileState[] = []
    const total_files = safe_files.length
    for (let i = 0; i < total_files; i++) {
      params.on_progress(Math.round((i / total_files) * 100))
      const file = safe_files[i]
      const workspace_root = resolve_workspace_root({
        workspace_name: file.workspace_name,
        workspace_map,
        default_workspace
      })

      const safe_path = create_safe_path(workspace_root, file.file_path)

      if (!safe_path) continue

      if (file.is_deleted) {
        const delete_result = await handle_deleted_file_item({
          file,
          safe_path,
          workspace_root,
          workspace_map,
          default_workspace,
          function_name: 'handle_fast_replace'
        })
        if (delete_result.success && delete_result.original_state) {
          original_states.push(delete_result.original_state)
        }
        continue
      }

      const {
        rename_source_path,
        rename_source_workspace_root,
        is_pure_rename,
        original_content
      } = await prepare_rename_operation({
        file,
        workspace_map,
        default_workspace
      })

      if (rename_source_path && rename_source_workspace_root) {
        try {
          await relocate_file({
            old_path: file.renamed_from!,
            new_path: file.file_path,
            old_workspace_root: rename_source_workspace_root,
            new_workspace_root: workspace_root
          })

          if (!is_pure_rename) {
             await vscode.workspace.fs.writeFile(
               vscode.Uri.file(safe_path),
               Buffer.from(file.content, 'utf8')
             )
          }

          original_states.push({
            file_path: file.file_path,
            content: original_content,
            workspace_name: file.workspace_name,
            file_path_to_restore: file.renamed_from,
            restore_workspace_name: file.renamed_from_workspace,
            ai_content: file.content,
            proposed_content: is_pure_rename ? '' : file.content,
            is_pure_rename
          })
          continue
        } catch (error) {
          Logger.error({
            function_name: 'handle_fast_replace',
            message: 'Error handling rename',
            data: { error, file_path: file.file_path }
          })
          vscode.window.showErrorMessage(
            t('command.apply-response-command.error.processing-file', {
              path: file.file_path,
              msg: get_error_message(error)
            })
          )
          continue
        }
      }

      const file_exists = fs.existsSync(safe_path)

      try {
        if (file_exists) {
          const file_uri = vscode.Uri.file(safe_path)
          const document = await vscode.workspace.openTextDocument(file_uri)
          const original_content_doc = document.getText()
          const final_content = preserve_trailing_newline(original_content_doc, file.content)

          original_states.push({
            file_path: file.file_path,
            content: original_content_doc,
            workspace_name: file.workspace_name,
            ai_content: file.content,
            proposed_content: final_content
          })

          await replace_document_content(document, final_content)

          Logger.info({
            function_name: 'handle_fast_replace',
            message: 'Existing file replaced and saved',
            data: safe_path
          })
        } else {
          original_states.push({
            file_path: file.file_path,
            content: '',
            file_state: 'new',
            workspace_name: file.workspace_name,
            ai_content: file.content,
            proposed_content: file.content
          })

          try {
            await ensure_directory_exists(safe_path)
          } catch (error) {
            Logger.error({
              function_name: 'handle_fast_replace',
              message: 'Failed to create directory',
              data: { error, file_path: file.file_path }
            })
            vscode.window.showErrorMessage(
              t(
                'command.apply-response-command.error.failed-to-create-directory',
                {
                  path: file.file_path
                }
              )
            )
            continue
          }

          try {
            fs.writeFileSync(safe_path, file.content)
            Logger.info({
              function_name: 'handle_fast_replace',
              message: 'New file created',
              data: safe_path
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_fast_replace',
              message: 'Failed to write new file',
              data: { safe_path, error, file_path: file.file_path }
            })
            vscode.window.showErrorMessage(
              t('command.apply-response-command.error.failed-to-write-file', {
                path: file.file_path
              })
            )
            continue
          }
        }
      } catch (error) {
        Logger.error({
          function_name: 'handle_fast_replace',
          message: 'Error processing file during replacement',
          data: { error, file_path: file.file_path }
        })
        vscode.window.showErrorMessage(
          t('command.apply-response-command.error.processing-file', {
            path: file.file_path,
            msg: get_error_message(error)
          })
        )
        continue
      }
    }

    Logger.info({
      function_name: 'handle_fast_replace',
      message: 'Files replaced successfully',
      data: { file_count: safe_files.length }
    })
    return { success: true, original_states }
  } catch (error) {
    Logger.error({
      function_name: 'handle_fast_replace',
      message: 'Error during direct file replacement',
      data: error
    })
    console.error('Error during direct file replacement:', error)
    vscode.window.showErrorMessage(
      t('command.apply-response-command.error.replacing-files', {
        msg: get_error_message(error)
      })
    )
    return { success: false }
  }
}

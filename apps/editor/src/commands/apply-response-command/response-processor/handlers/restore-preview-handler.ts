import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { create_safe_path } from '@/utils/path-sanitizer'
import { t } from '@/i18n'
import { OriginalFileState } from '../../types/original-file-state'
import { FileInPreview } from '@shared/types/file-in-preview'
import {
  get_workspace_map_and_default,
  resolve_workspace_root
} from '../../utils/workspace'
import { remove_directory_if_empty, relocate_file, preserve_trailing_newline, replace_document_content, ensure_directory_exists } from '../../utils/file-operations'

export const handle_restore_preview = async (
  files: FileInPreview[]
): Promise<{ success: boolean; original_states?: OriginalFileState[] }> => {
  Logger.info({
    function_name: 'handle_restore_preview',
    message: 'start',
    data: { file_count: files.length }
  })

  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    vscode.window.showErrorMessage(
      t('command.apply-response-command.error.no-workspace-folder')
    )
    Logger.warn({
      function_name: 'handle_restore_preview',
      message: 'No workspace folder open.'
    })
    return { success: false }
  }

  const { workspace_map, default_workspace } = get_workspace_map_and_default()

  const original_states: OriginalFileState[] = []

  const rename_sources = new Set<string>()
  for (const file of files) {
    if (file.renamed_from) {
      rename_sources.add(`${file.renamed_from_workspace ?? file.workspace_name ?? ''}:${file.renamed_from}`)
    }
  }

  for (const file of files) {
    const workspace_root = resolve_workspace_root({
      workspace_name: file.workspace_name,
      workspace_map,
      default_workspace,
      file_path: file.file_path,
      function_name: 'handle_restore_preview'
    })

    const safe_path = create_safe_path(workspace_root, file.file_path)

    if (!safe_path) {
      Logger.warn({
        function_name: 'handle_restore_preview',
        message: 'Unsafe file path detected and skipped',
        data: file.file_path
      })
      continue
    }

    const file_exists = fs.existsSync(safe_path)
    let original_content = ''
    if (file_exists) {
      if (!file.is_pure_rename) {
        try {
          const document = await vscode.workspace.openTextDocument(safe_path)
          original_content = document.getText()
        } catch (e) {
          Logger.warn({
            function_name: 'handle_restore_preview',
            message: 'Could not read original content of file',
            data: { file_path: safe_path, error: e }
          })
        }
      }
    } else if (file.renamed_from) {
      const source_workspace_root = resolve_workspace_root({
        workspace_name: file.renamed_from_workspace ?? file.workspace_name,
        workspace_map,
        default_workspace
      })
      const source_safe_path = create_safe_path(source_workspace_root, file.renamed_from)
      if (source_safe_path && fs.existsSync(source_safe_path)) {
        try {
          const document = await vscode.workspace.openTextDocument(source_safe_path)
          original_content = document.getText()
        } catch (e) {}
      }
    }

    original_states.push({
      file_path: file.file_path,
      content: original_content,
      workspace_name: file.workspace_name,
      file_state:
        file.file_state === 'deleted'
          ? 'deleted'
          : !file_exists
            ? 'new'
            : file.file_state,
      is_checked: file.is_checked,
      diff_application_method: file.diff_application_method,
      is_pure_rename: file.is_pure_rename,
      file_path_to_restore: file.renamed_from,
      restore_workspace_name: file.renamed_from_workspace
    })

    if (file.is_checked !== false) {
      if (file.renamed_from) {
        const source_workspace_root = resolve_workspace_root({
          workspace_name: file.renamed_from_workspace ?? file.workspace_name,
          workspace_map,
          default_workspace
        })
        
        await relocate_file({
          old_path: file.renamed_from,
          new_path: file.file_path,
          old_workspace_root: source_workspace_root,
          new_workspace_root: workspace_root
        })
        
        if (!file.is_pure_rename && file.content !== undefined) {
          const file_uri = vscode.Uri.file(safe_path)
          const document = await vscode.workspace.openTextDocument(file_uri)
          const final_content = preserve_trailing_newline(original_content, file.content)
          await replace_document_content(document, final_content)
          Logger.info({
            function_name: 'handle_restore_preview',
            message: 'Existing file replaced and saved after relocation',
            data: safe_path
          })
        }
      } else if (file.file_state === 'deleted') {
        const file_key = `${file.workspace_name ?? ''}:${file.file_path}`
        if (rename_sources.has(file_key)) {
          continue
        }
        
        if (file_exists) {
          try {
            const tabs_to_close: vscode.Tab[] = []
            for (const tab_group of vscode.window.tabGroups.all) {
              tabs_to_close.push(
                ...tab_group.tabs.filter((tab) => {
                  const tab_uri = (tab.input as any)?.uri as
                    | vscode.Uri
                    | undefined
                  return tab_uri && tab_uri.fsPath === safe_path
                })
              )
            }

            if (tabs_to_close.length > 0) {
              await vscode.window.tabGroups.close(tabs_to_close)
            }

            fs.unlinkSync(safe_path)
            Logger.info({
              function_name: 'handle_restore_preview',
              message: 'File deleted',
              data: safe_path
            })
            await remove_directory_if_empty({
              dir_path: path.dirname(safe_path),
              workspace_root
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_restore_preview',
              message: 'Error deleting file',
              data: { safe_path, error }
            })
            vscode.window.showErrorMessage(
              `Failed to delete file: ${file.file_path}`
            )
          }
        }
      } else if (file.content !== undefined) {
        if (file_exists) {
          try {
            const file_uri = vscode.Uri.file(safe_path)
            const document = await vscode.workspace.openTextDocument(file_uri)
            const final_content = preserve_trailing_newline(original_content, file.content)
            await replace_document_content(document, final_content)

            Logger.info({
              function_name: 'handle_restore_preview',
              message: 'Existing file replaced and saved',
              data: safe_path
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_restore_preview',
              message: 'Error updating file',
              data: { safe_path, error }
            })
            vscode.window.showErrorMessage(
              `Failed to update file: ${file.file_path}`
            )
          }
        } else {
          try {
            await ensure_directory_exists(safe_path)
          } catch (error) {
            Logger.error({
              function_name: 'handle_restore_preview',
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
              function_name: 'handle_restore_preview',
              message: 'New file created',
              data: safe_path
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_restore_preview',
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
      }
    }
  }

  return { success: true, original_states }
}

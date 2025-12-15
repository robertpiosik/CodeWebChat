import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'
import { FileItem } from '../utils/clipboard-parser'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { remove_directory_if_empty } from '../utils/file-operations'

export const handle_fast_replace = async (
  files: FileItem[]
): Promise<{ success: boolean; original_states?: OriginalFileState[] }> => {
  Logger.info({
    function_name: 'handle_fast_replace',
    message: 'start',
    data: { file_count: files.length }
  })
  try {
    const safe_files: FileItem[] = []
    const unsafe_files: string[] = []

    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length == 0
    ) {
      vscode.window.showErrorMessage(
        dictionary.error_message.NO_WORKSPACE_FOLDER_OPEN
      )
      Logger.warn({
        function_name: 'handle_fast_replace',
        message: 'No workspace folder open.'
      })
      return { success: false }
    }

    const workspace_map = new Map<string, string>()
    vscode.workspace.workspaceFolders.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })

    const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

    for (const file of files) {
      let workspace_root = default_workspace
      if (file.workspace_name && workspace_map.has(file.workspace_name)) {
        workspace_root = workspace_map.get(file.workspace_name)!
      } else if (file.workspace_name) {
        Logger.warn({
          function_name: 'handle_fast_replace',
          message: `Workspace '${file.workspace_name}' not found for file '${file.file_path}'. Using default.`
        })
      }

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
        dictionary.error_message.UNSAFE_FILE_PATHS_SKIPPED(
          unsafe_files.length,
          unsafe_list
        )
      )
      Logger.warn({
        function_name: 'handle_fast_replace',
        message: 'Unsafe file paths detected and skipped',
        data: unsafe_files
      })

      if (safe_files.length == 0) {
        return { success: false }
      }
    }

    const original_states: OriginalFileState[] = []
    for (const file of safe_files) {
      let workspace_root = default_workspace
      if (file.workspace_name && workspace_map.has(file.workspace_name)) {
        workspace_root = workspace_map.get(file.workspace_name)!
      }

      const safe_path = create_safe_path(workspace_root, file.file_path)

      if (!safe_path) continue

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
              function_name: 'handle_fast_replace',
              message: 'Failed to read rename source file',
              data: safe_rename_path
            })
          }
        }
      }

      if (rename_source_path && rename_source_content !== undefined) {
        try {
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
            Buffer.from(file.content, 'utf8')
          )

          const document = await vscode.workspace.openTextDocument(safe_path)
          await vscode.window.showTextDocument(document, { preview: false })

          original_states.push({
            file_path: file.file_path,
            content: rename_source_content,
            workspace_name: file.workspace_name,
            file_path_to_restore: file.renamed_from
          })

          continue
        } catch (error: any) {
          Logger.error({
            function_name: 'handle_fast_replace',
            message: 'Error handling rename',
            data: { error, file_path: file.file_path }
          })
          vscode.window.showErrorMessage(
            dictionary.error_message.ERROR_PROCESSING_FILE(
              file.file_path,
              error.message || 'Unknown error'
            )
          )
          continue
        }
      }

      const file_exists = fs.existsSync(safe_path)

      try {
        if (file_exists) {
          if (file.content == '') {
            const file_uri = vscode.Uri.file(safe_path)
            const document = await vscode.workspace.openTextDocument(file_uri)
            const original_content = document.getText()
            original_states.push({
              file_path: file.file_path,
              content: original_content,
              workspace_name: file.workspace_name,
              file_state: 'deleted'
            })

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
              function_name: 'handle_fast_replace',
              message: 'File deleted due to empty content',
              data: safe_path
            })
            await remove_directory_if_empty({
              dir_path: path.dirname(safe_path),
              workspace_root
            })
          } else {
            const file_uri = vscode.Uri.file(safe_path)
            const document = await vscode.workspace.openTextDocument(file_uri)
            const original_content = document.getText()
            original_states.push({
              file_path: file.file_path,
              content: original_content,
              workspace_name: file.workspace_name
            })
            const editor = await vscode.window.showTextDocument(document)
            let final_content = file.content
            if (
              original_content.endsWith('\n') &&
              !final_content.endsWith('\n')
            ) {
              final_content += '\n'
            }
            await editor.edit((edit) => {
              edit.replace(
                new vscode.Range(
                  document.positionAt(0),
                  document.positionAt(document.getText().length)
                ),
                final_content
              )
            })

            await document.save()
            Logger.info({
              function_name: 'handle_fast_replace',
              message: 'Existing file replaced and saved',
              data: safe_path
            })
          }
        } else {
          original_states.push({
            file_path: file.file_path,
            content: '',
            file_state: 'new',
            workspace_name: file.workspace_name
          })
          if (file.content == '') {
            continue
          }
          const directory = path.dirname(safe_path)
          if (!fs.existsSync(directory)) {
            try {
              fs.mkdirSync(directory, { recursive: true })
              Logger.info({
                function_name: 'handle_fast_replace',
                message: 'Directory created',
                data: directory
              })
            } catch (error) {
              Logger.error({
                function_name: 'handle_fast_replace',
                message: 'Failed to create directory',
                data: { directory, error, file_path: file.file_path }
              })
              vscode.window.showErrorMessage(
                dictionary.error_message.FAILED_TO_CREATE_DIRECTORY(
                  file.file_path
                )
              )
              continue
            }
          }

          try {
            fs.writeFileSync(safe_path, file.content)
            Logger.info({
              function_name: 'handle_fast_replace',
              message: 'New file created',
              data: safe_path
            })
            const document = await vscode.workspace.openTextDocument(safe_path)
            await vscode.window.showTextDocument(document, { preview: false })
          } catch (error) {
            Logger.error({
              function_name: 'handle_fast_replace',
              message: 'Failed to write new file',
              data: { safe_path, error, file_path: file.file_path }
            })
            vscode.window.showErrorMessage(
              dictionary.error_message.FAILED_TO_WRITE_FILE(file.file_path)
            )
            continue
          }
        }
      } catch (error: any) {
        Logger.error({
          function_name: 'handle_fast_replace',
          message: 'Error processing file during replacement',
          data: { error, file_path: file.file_path }
        })
        vscode.window.showErrorMessage(
          dictionary.error_message.ERROR_PROCESSING_FILE(
            file.file_path,
            error.message || 'Unknown error'
          )
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
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_fast_replace',
      message: 'Error during direct file replacement',
      data: error
    })
    console.error('Error during direct file replacement:', error)
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_REPLACING_FILES(
        error.message || 'Unknown error'
      )
    )
    return { success: false }
  }
}

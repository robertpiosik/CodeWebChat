import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { Logger } from '../../../utils/logger'
import { promisify } from 'util'
import { OriginalFileState } from '../../../types/common'
import { format_document } from './format-document'
import { create_safe_path } from '@/utils/path-sanitizer'
import { process_diff_patch } from './diff-patch-processor'

const execAsync = promisify(exec)

export function extract_file_paths_from_patch(patch_content: string): string[] {
  const file_paths: string[] = []
  const lines = patch_content.split('\n')
  let from_path: string | undefined
  let to_path: string | undefined

  for (const line of lines) {
    const match = line.match(/^\+\+\+ b\/(.+)$/)
    if (match && match[1]) {
      to_path = match[1]
    }
    const from_match = line.match(/^--- a\/(.+)$/)
    if (from_match && from_match[1]) {
      from_path = from_match[1]
    }
  }

  if (to_path && to_path != '/dev/null') {
    file_paths.push(to_path.trim().replace(/\t.*$/, ''))
  } else if (from_path && from_path != '/dev/null') {
    file_paths.push(from_path.trim().replace(/\t.*$/, ''))
  }

  return [...new Set(file_paths)]
}

export async function store_original_file_states(
  patch_content: string,
  workspace_path: string
): Promise<OriginalFileState[]> {
  const file_paths = extract_file_paths_from_patch(patch_content)
  const original_states: OriginalFileState[] = []

  for (const file_path of file_paths) {
    const safe_path = create_safe_path(workspace_path, file_path)
    if (!safe_path) {
      Logger.error({
        function_name: 'store_original_file_states',
        message: 'Skipping file with unsafe path',
        data: { file_path }
      })
      continue
    }

    if (fs.existsSync(safe_path)) {
      try {
        const content = fs.readFileSync(safe_path, 'utf8')
        original_states.push({
          file_path,
          content,
          is_new: false,
          workspace_name: path.basename(workspace_path)
        })
      } catch (error) {
        Logger.error({
          function_name: 'store_original_file_states',
          message: 'Failed to read file content',
          data: { file_path, error }
        })
      }
    } else {
      original_states.push({
        file_path,
        content: '',
        is_new: true,
        workspace_name: path.basename(workspace_path)
      })
    }
  }

  return original_states
}

// Ensures all target files are closed before applying patches
async function close_files_in_all_editor_groups(
  file_paths: string[],
  workspace_path: string
): Promise<vscode.Uri[]> {
  const closed_files: vscode.Uri[] = []

  for (const file_path of file_paths) {
    const safe_path = create_safe_path(workspace_path, file_path)
    if (!safe_path) {
      continue
    }

    const uri = vscode.Uri.file(safe_path)

    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.fsPath === uri.fsPath) {
        if (editor.document.isDirty) {
          await editor.document.save()
        }

        closed_files.push(editor.document.uri)

        await vscode.window.showTextDocument(editor.document, { preview: true })
        await vscode.commands.executeCommand(
          'workbench.action.closeActiveEditor'
        )
      }
    }
  }

  return closed_files
}

// Reopens files that were closed before patch application
async function reopen_closed_files(closedFiles: vscode.Uri[]): Promise<void> {
  for (const uri of closedFiles) {
    try {
      const document = await vscode.workspace.openTextDocument(uri)
      await vscode.window.showTextDocument(document, { preview: false })
    } catch (error) {
      Logger.error({
        function_name: 'reopen_closed_files',
        message: 'Failed to reopen file',
        data: { file_path: uri.fsPath, error }
      })
    }
  }
}

// Opens, formats, and saves a list of files.
async function process_modified_files(
  file_paths: string[],
  workspace_path: string
): Promise<void> {
  for (const file_path of file_paths) {
    const safe_path = create_safe_path(workspace_path, file_path)
    if (!safe_path) {
      Logger.error({
        function_name: 'process_modified_files',
        message: 'Skipping file with unsafe path',
        data: { file_path }
      })
      continue
    }

    if (fs.existsSync(safe_path)) {
      if (fs.readFileSync(safe_path, 'utf8').trim() === '') {
        try {
          const uri = vscode.Uri.file(safe_path)
          const text_editors = vscode.window.visibleTextEditors.filter(
            (editor) => editor.document.uri.toString() === uri.toString()
          )
          for (const editor of text_editors) {
            await vscode.window.showTextDocument(editor.document, {
              preview: false,
              preserveFocus: false
            })
            await vscode.commands.executeCommand(
              'workbench.action.closeActiveEditor'
            )
          }

          fs.unlinkSync(safe_path)
          Logger.log({
            function_name: 'process_modified_files',
            message: 'File was empty after patch, removed from disk.',
            data: { file_path }
          })
        } catch (error) {
          Logger.error({
            function_name: 'process_modified_files',
            message: 'Error deleting empty file',
            data: { file_path, error }
          })
        }
      } else {
        try {
          const uri = vscode.Uri.file(safe_path)
          const document = await vscode.workspace.openTextDocument(uri)
          await vscode.window.showTextDocument(document, { preview: false })
          await format_document(document)
          await document.save()
          Logger.log({
            function_name: 'process_modified_files',
            message: 'Successfully processed file',
            data: { file_path }
          })
        } catch (error) {
          Logger.error({
            function_name: 'process_modified_files',
            message: 'Error processing file',
            data: { file_path, error }
          })
        }
      }
    } else {
      Logger.log({
        function_name: 'process_modified_files',
        message:
          'Skipping processing for non-existent file (likely deleted by patch)',
        data: { file_path }
      })
    }
  }
}

export async function apply_git_patch(
  patch_content: string,
  workspace_path: string
): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  used_fallback?: boolean
}> {
  let closed_files: vscode.Uri[] = []

  try {
    const file_paths = extract_file_paths_from_patch(patch_content)
    const original_states = await store_original_file_states(
      patch_content,
      workspace_path
    )

    closed_files = await close_files_in_all_editor_groups(
      file_paths,
      workspace_path
    )

    const temp_file = path.join(workspace_path, '.tmp_patch')
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(temp_file),
      Buffer.from(patch_content)
    )

    // Apply the patch
    try {
      let used_fallback = false
      try {
        await execAsync(
          'git apply --whitespace=fix --ignore-whitespace --recount ' +
            temp_file,
          {
            cwd: workspace_path
          }
        )
      } catch (error) {
        // git apply failed, now trying to apply with custom diff processor as fallback
        const file_path_safe = create_safe_path(workspace_path, file_paths[0])

        if (file_path_safe == null) {
          throw new Error('File path is null')
        }

        try {
          await process_diff_patch(file_path_safe, temp_file)
          used_fallback = true
        } catch (error: any) {
          Logger.error({
            function_name: 'apply_git_patch',
            message: 'Custom diff processor failed',
            data: error
          })
          throw new Error(`Failed to apply diff patch: ${error.message}`)
        }
      }

      Logger.log({
        function_name: 'apply_git_patch',
        message: `Patch applied successfully${
          used_fallback ? ' using fallback' : ''
        }`,
        data: { workspace_path }
      })

      await process_modified_files(file_paths, workspace_path)

      await vscode.workspace.fs.delete(vscode.Uri.file(temp_file))

      return { success: true, original_states, used_fallback }
    } catch (error: any) {
      await reopen_closed_files(closed_files)

      // NOTE: This has not been implementred yet in the custom diff processor. Can be added later.
      const has_rejects = error.message.includes('.rej')

      if (has_rejects) {
        // Even with partial failure, try to format the files that were modified
        await process_modified_files(file_paths, workspace_path)
      }

      Logger.error({
        function_name: 'apply_git_patch',
        message: 'Error applying patch',
        data: { error, workspace_path }
      })

      await vscode.workspace.fs.delete(vscode.Uri.file(temp_file))

      return { success: false }
    }
  } catch (error: any) {
    if (closed_files.length > 0) {
      await reopen_closed_files(closed_files)
    }

    Logger.error({
      function_name: 'apply_git_patch',
      message: 'Error handling patch file',
      data: { error, workspace_path }
    })
    vscode.window.showErrorMessage(
      `Error handling patch: ${error.message || 'Unknown error'}`
    )
    return { success: false }
  }
}

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { Logger } from '@shared/utils/logger'
import { promisify } from 'util'
import { OriginalFileState } from '../types/original-file-state'
import { create_safe_path } from '@/utils/path-sanitizer'
import { apply_diff, process_diff } from '../utils/diff-processor'
import { remove_directory_if_empty } from '../utils/file-operations'

const execAsync = promisify(exec)

interface PatchFileInfo {
  from_path?: string
  to_path?: string
  is_new?: boolean
  is_deleted?: boolean
  is_renaming?: boolean
}

const parse_patch_header = (
  patch_content: string,
  workspace_path?: string
): PatchFileInfo => {
  const lines = patch_content.split('\n')
  let from_path: string | undefined
  let to_path: string | undefined
  let is_new: boolean | undefined
  let is_deleted: boolean | undefined
  let is_renaming: boolean | undefined
  let from_found = false
  let to_found = false

  for (const line of lines) {
    if (line.startsWith('---')) {
      from_found = true
      if (line == '--- /dev/null') {
        is_new = true
      } else {
        const from_match = line.match(/^--- a\/(.+)$/)
        if (from_match && from_match[1]) {
          from_path = from_match[1]
        }
      }
    } else if (line.startsWith('+++')) {
      to_found = true
      if (line == '+++ /dev/null') {
        is_deleted = true
      } else {
        const match = line.match(/^\+\+\+ b\/(.+)$/)
        if (match && match[1]) {
          to_path = match[1]
        }
      }
    }

    if (from_found && to_found) {
      break
    }
  }

  // Sometimes --- and +++ paths are identical (meant to update) but file is not on disk
  if (
    !is_new &&
    from_path &&
    to_path &&
    from_path == to_path &&
    workspace_path
  ) {
    const safe_path = create_safe_path(workspace_path, to_path)
    if (safe_path && !fs.existsSync(safe_path)) {
      is_new = true
    }
  }

  // Check if it's a rename-only diff.
  // This is indicated by IDENTICAL from/to paths and no content hunks.
  if (from_path && to_path && from_path == to_path) {
    const header_end_index = lines.findIndex((line) => line.startsWith('+++'))
    if (header_end_index != -1) {
      const remaining_content = lines.slice(header_end_index + 1).join('\n')
      if (remaining_content.trim() == '') {
        is_renaming = true
      }
    }
  }

  return { from_path, to_path, is_new, is_deleted, is_renaming }
}

export const extract_file_paths_from_patch = (
  patch_content: string
): string[] => {
  const { from_path, to_path } = parse_patch_header(patch_content)
  const paths = new Set<string>()
  if (from_path) paths.add(from_path)
  if (to_path) paths.add(to_path)
  return Array.from(paths)
}

export const store_original_file_states = async (
  patch_content: string,
  workspace_path: string
): Promise<OriginalFileState[]> => {
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

// Helper function to extract content from patch for preview
export const extract_content_from_patch = (
  patch_content: string,
  original_content: string
): string => {
  try {
    return apply_diff({
      original_code: original_content,
      diff_patch: patch_content
    })
  } catch (error) {
    Logger.warn({
      function_name: 'extract_content_from_patch',
      message: 'Failed to extract patch content, returning original',
      data: { error }
    })
    return original_content
  }
}

// Ensures all target files are closed before applying patches
async function close_files_in_all_editor_groups(
  file_paths: string[],
  workspace_path: string
): Promise<vscode.Uri[]> {
  const closed_files: vscode.Uri[] = []
  const files_to_close = new Set<string>()

  for (const file_path of file_paths) {
    const safe_path = create_safe_path(workspace_path, file_path)
    if (safe_path) {
      files_to_close.add(safe_path)
    }
  }

  const tabs_to_close: vscode.Tab[] = []
  for (const tab_group of vscode.window.tabGroups.all) {
    tabs_to_close.push(
      ...tab_group.tabs.filter((tab) => {
        const uri = (tab.input as any)?.uri as vscode.Uri | undefined
        return uri && files_to_close.has(uri.fsPath)
      })
    )
  }

  for (const tab of tabs_to_close) {
    const uri = (tab.input as any).uri
    if (tab.isDirty) {
      const document = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.fsPath == uri.fsPath
      )
      if (document) await document.save()
    }
    closed_files.push(uri)
  }

  if (tabs_to_close.length > 0) {
    await vscode.window.tabGroups.close(tabs_to_close)
  }

  return [...new Map(closed_files.map((item) => [item.fsPath, item])).values()]
}

// Reopens files that were closed before patch application
async function reopen_closed_files(closed_files: vscode.Uri[]): Promise<void> {
  for (const uri of closed_files) {
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
      if (fs.readFileSync(safe_path, 'utf8').trim() == '') {
        try {
          const uri = vscode.Uri.file(safe_path)
          const text_editors = vscode.window.visibleTextEditors.filter(
            (editor) => editor.document.uri.toString() == uri.toString()
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
          Logger.info({
            function_name: 'process_modified_files',
            message: 'File was empty after patch, removed from disk.',
            data: { file_path }
          })
          await remove_directory_if_empty({
            dir_path: path.dirname(safe_path),
            workspace_root: workspace_path
          })
        } catch (error) {
          Logger.error({
            function_name: 'process_modified_files',
            message: 'Error deleting empty file',
            data: { file_path, error }
          })
        }
      }
    } else {
      Logger.info({
        function_name: 'process_modified_files',
        message:
          'Skipping processing for non-existent file (likely deleted by patch)',
        data: { file_path }
      })
    }
  }
}

const handle_new_file_patch = async (
  patch_content: string,
  workspace_path: string
): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  diff_fallback_method?: 'recount' | 'search_and_replace'
}> => {
  const file_paths = extract_file_paths_from_patch(patch_content)
  if (file_paths.length != 1) {
    Logger.error({
      function_name: 'handle_new_file_patch',
      message: 'New file patch is expected to contain exactly one file path.',
      data: { file_paths, patch_content }
    })
    return { success: false }
  }

  const file_path = file_paths[0]
  const safe_path = create_safe_path(workspace_path, file_path)

  if (!safe_path) {
    Logger.error({
      function_name: 'handle_new_file_patch',
      message: 'Invalid file path for new file.',
      data: { file_path }
    })
    return { success: false }
  }

  // `store_original_file_states` will correctly identify this as a new file.
  const original_states = await store_original_file_states(
    patch_content,
    workspace_path
  )

  try {
    const lines = patch_content.split('\n')
    const content_lines: string[] = []
    let in_hunk = false

    for (const line of lines) {
      if (line.startsWith('@@')) {
        in_hunk = true
        continue
      }
      if (in_hunk && line.startsWith('+')) {
        content_lines.push(line.substring(1))
      }
    }
    const new_content = content_lines.join('\n')

    const dir = path.dirname(safe_path)
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true })
    }

    await fs.promises.writeFile(safe_path, new_content, 'utf8')

    const document = await vscode.workspace.openTextDocument(safe_path)
    await vscode.window.showTextDocument(document, { preview: false })

    return { success: true, original_states }
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_new_file_patch',
      message: 'Failed to create new file from patch.',
      data: { error: error.message, file_path }
    })
    // Attempt cleanup if file was created but something went wrong.
    if (fs.existsSync(safe_path)) await fs.promises.unlink(safe_path)
    return { success: false }
  }
}

const handle_deleted_file_patch = async (
  patch_content: string,
  workspace_path: string
): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  diff_fallback_method?: 'recount' | 'search_and_replace'
}> => {
  const file_paths = extract_file_paths_from_patch(patch_content)
  if (file_paths.length != 1) {
    Logger.error({
      function_name: 'handle_deleted_file_patch',
      message:
        'Deleted file patch is expected to contain exactly one file path.',
      data: { file_paths, patch_content }
    })
    return { success: false }
  }

  const file_path = file_paths[0]
  const safe_path = create_safe_path(workspace_path, file_path)

  if (!safe_path) {
    Logger.error({
      function_name: 'handle_deleted_file_patch',
      message: 'Invalid file path for deleted file.',
      data: { file_path }
    })
    return { success: false }
  }

  const original_states = await store_original_file_states(
    patch_content,
    workspace_path
  )

  try {
    await close_files_in_all_editor_groups(file_paths, workspace_path)

    if (fs.existsSync(safe_path)) {
      await fs.promises.unlink(safe_path)
      Logger.info({
        function_name: 'handle_deleted_file_patch',
        message: 'File deleted successfully.',
        data: { file_path }
      })
      await remove_directory_if_empty({
        dir_path: path.dirname(safe_path),
        workspace_root: workspace_path
      })
    } else {
      Logger.warn({
        function_name: 'handle_deleted_file_patch',
        message: 'File to be deleted does not exist.',
        data: { file_path }
      })
    }

    return { success: true, original_states }
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_deleted_file_patch',
      message: 'Failed to delete file from patch.',
      data: { error: error.message, file_path }
    })
    return { success: false }
  }
}

export const apply_git_patch = async (
  patch_content: string,
  workspace_path: string
): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  diff_fallback_method?: 'recount' | 'search_and_replace'
}> => {
  const patch_info = parse_patch_header(patch_content, workspace_path)

  if (patch_info.is_new) {
    return handle_new_file_patch(patch_content, workspace_path)
  }

  if (patch_info.is_deleted) {
    return handle_deleted_file_patch(patch_content, workspace_path)
  }

  let closed_files: vscode.Uri[] = []
  const temp_file = path.join(workspace_path, '.tmp_patch')

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

    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(temp_file),
      Buffer.from(patch_content)
    )
    await new Promise((r) => setTimeout(r, 100))

    let last_error: any = null
    let success = false
    let diff_fallback_method: 'recount' | 'search_and_replace' | undefined =
      undefined

    if (patch_info.is_renaming) {
      // Skip git apply and fallbacks, renaming here is a base case
      // where no content is changing, just paths. File is already copied.
      success = true
    }

    // Attempt 1: Standard git apply
    if (!success) {
      try {
        await execAsync(
          `git apply --whitespace=fix --ignore-whitespace "${temp_file}"`,
          { cwd: workspace_path }
        )
        success = true
        Logger.info({
          function_name: 'apply_git_patch',
          message: 'Patch applied successfully with standard git apply.'
        })
      } catch (error) {
        last_error = error
      }
    }

    // Attempt 2: git apply with --recount
    if (!success) {
      Logger.warn({
        function_name: 'apply_git_patch',
        message: 'Standard git apply failed, trying with --recount.',
        data: { error: last_error }
      })
      try {
        await execAsync(
          `git apply --whitespace=fix --ignore-whitespace --recount "${temp_file}"`,
          { cwd: workspace_path }
        )
        success = true
        diff_fallback_method = 'recount'
        Logger.info({
          function_name: 'apply_git_patch',
          message: 'Patch applied successfully with --recount fallback.'
        })
      } catch (error) {
        last_error = error
      }
    }

    // Attempt 3: Custom diff processor
    if (!success) {
      Logger.warn({
        function_name: 'apply_git_patch',
        message:
          'git apply with --recount failed, trying custom diff processor.',
        data: { error: last_error }
      })
      try {
        const file_path_safe = create_safe_path(workspace_path, file_paths[0])
        if (file_path_safe == null) throw new Error('File path is null')
        await process_diff({
          file_path: file_path_safe,
          diff_path_patch: temp_file
        })
        success = true
        diff_fallback_method = 'search_and_replace'
        Logger.info({
          function_name: 'apply_git_patch',
          message: 'Patch applied successfully with custom processor fallback.'
        })
      } catch (error) {
        last_error = error
      }
    }

    // Cleanup and return
    if (success) {
      await process_modified_files(file_paths, workspace_path)
      await reopen_closed_files(closed_files)
      await vscode.workspace.fs.delete(vscode.Uri.file(temp_file))
      return {
        success: true,
        original_states: original_states,
        diff_fallback_method
      }
    } else {
      // All methods failed, throw the last logged error to be handled by the outer catch
      throw last_error
    }
  } catch (error: any) {
    // This outer catch handles setup errors and final application failures
    await reopen_closed_files(closed_files)

    try {
      if (fs.existsSync(temp_file)) {
        await vscode.workspace.fs.delete(vscode.Uri.file(temp_file))
      }
    } catch (deleteError) {
      Logger.warn({
        function_name: 'apply_git_patch',
        message: 'Failed to delete temp patch file in error handler.',
        data: deleteError
      })
    }

    const has_rejects = error?.message?.includes('.rej')
    if (has_rejects) {
      const file_paths = extract_file_paths_from_patch(patch_content)
      await process_modified_files(file_paths, workspace_path)
    }

    Logger.error({
      function_name: 'apply_git_patch',
      message: 'Error during patch process',
      data: { error, workspace_path }
    })

    return { success: false }
  }
}

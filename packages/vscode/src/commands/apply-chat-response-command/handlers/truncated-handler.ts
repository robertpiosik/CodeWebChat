import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { create_safe_path, sanitize_file_name } from '@/utils/path-sanitizer'
import { FileItem } from '../utils/clipboard-parser'
import { OriginalFileState } from '../types/original-file-state'

const TRUNCATION_REGEX = /^\s*(\/\/|#|<!--|;|"|')\s*\.{3,}.*\s*$/

export const is_truncation_line = (line: string) => TRUNCATION_REGEX.test(line)

export const handle_truncated_edit = async (
  files: FileItem[]
): Promise<{
  success: boolean
  original_states?: OriginalFileState[]
  failed_files?: FileItem[]
}> => {
  Logger.info({
    function_name: 'handle_truncated_edit',
    message: 'start',
    data: { file_count: files.length }
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

  for (const file of files) {
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

    if (!fs.existsSync(safe_path)) {
      // Cannot fill truncations for a file that doesn't exist
      failed_files.push(file)
      Logger.warn({
        function_name: 'handle_truncated_edit',
        message: 'File not found for truncated edit',
        data: safe_path
      })
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
        workspace_name: file.workspace_name
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

function process_truncated_content(
  new_text: string,
  original_text: string
): string {
  const new_lines = new_text.split('\n')
  const original_lines = original_text.split('\n')

  const blocks: { type: 'code' | 'truncation'; lines: string[] }[] = []
  let buffer: string[] = []

  for (const line of new_lines) {
    if (is_truncation_line(line)) {
      if (buffer.length > 0) {
        blocks.push({ type: 'code', lines: buffer })
        buffer = []
      }
      blocks.push({ type: 'truncation', lines: [line] })
    } else {
      buffer.push(line)
    }
  }
  if (buffer.length > 0) {
    blocks.push({ type: 'code', lines: buffer })
  }

  const output_lines: string[] = []
  let current_original_idx = 0 // Line index in original

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (block.type === 'code') {
      output_lines.push(...block.lines)

      // Try to sync with original to handle replacements (context consumption)
      // We look for a suffix of this block in the original file.
      // If found, we advance current_original_idx to the end of that match.
      // This allows the block to "consume" original code, avoiding duplication.

      const search_window_size = 10 // How many lines of suffix to check
      const suffix_lines = block.lines.slice(-search_window_size)
      // We need at least one line that is unique enough? Let's try finding the block end.

      // Heuristic: Find the first occurrence of this suffix in Original after current_original_idx
      let found_match = false
      let match_end_idx = -1

      // Try finding the largest possible suffix that matches
      for (let len = suffix_lines.length; len >= 1; len--) {
        const sub_suffix = suffix_lines.slice(suffix_lines.length - len)
        // Find this sequence of lines in original_lines starting at current_original_idx
        const idx = find_line_sequence(
          original_lines,
          sub_suffix,
          current_original_idx
        )
        if (idx !== -1) {
          found_match = true
          match_end_idx = idx + len
          break
        }
      }

      if (found_match) {
        current_original_idx = match_end_idx
      }
    } else {
      // Truncation block
      // We need to fill from current_original_idx up to the start of the Next Block.

      let fill_end_idx = original_lines.length // Default to end of file

      if (i + 1 < blocks.length) {
        const next_block = blocks[i + 1]
        if (next_block.type === 'code') {
          // Find where the next block starts in original
          const prefix_lines = next_block.lines.slice(0, 10) // Check first 10 lines
          let found_next = false

          for (let len = prefix_lines.length; len >= 1; len--) {
            const sub_prefix = prefix_lines.slice(0, len)
            const idx = find_line_sequence(
              original_lines,
              sub_prefix,
              current_original_idx
            )
            if (idx !== -1) {
              fill_end_idx = idx
              found_next = true
              break
            }
          }

          if (!found_next) {
            // If we can't find the next block, we don't know where to stop filling.
            // This usually happens if the next block is entirely new code inserted after truncation.
            // We assume the truncation goes to the end, or we just stop here?
            // "Stop here" means we delete everything until end of file?
            // "End" means we keep everything?
            // Safety fallback: If we can't find next anchor, assume we keep until end?
            // But next block is appended after. So: Keep Original + Append Next Block.
            fill_end_idx = original_lines.length
          }
        }
      }

      // Append original content
      if (fill_end_idx > current_original_idx) {
        output_lines.push(
          ...original_lines.slice(current_original_idx, fill_end_idx)
        )
      }
      current_original_idx = fill_end_idx
    }
  }

  return output_lines.join('\n')
}

function find_line_sequence(
  lines: string[],
  sequence: string[],
  start_idx: number
): number {
  if (sequence.length === 0) return -1
  if (start_idx >= lines.length) return -1

  for (let i = start_idx; i <= lines.length - sequence.length; i++) {
    let match = true
    for (let j = 0; j < sequence.length; j++) {
      if (lines[i + j].trim() !== sequence[j].trim()) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}

import * as fs from 'fs'
import * as vscode from 'vscode'
import * as crypto from 'crypto'
import * as path from 'path'
import * as os from 'os'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { create_safe_path } from '@/utils/path-sanitizer'
import { get_diff_stats } from './diff-utils'
import { PreparedFile, ReviewableFile } from './types'

export const prepare_files_from_original_states = async (params: {
  original_states: OriginalFileState[]
  default_workspace: string
  workspace_map: Map<string, string>
}): Promise<PreparedFile[]> => {
  const prepared_files: PreparedFile[] = []

  for (const state of params.original_states) {
    let workspace_root = params.default_workspace
    if (
      state.workspace_name &&
      params.workspace_map.has(state.workspace_name)
    ) {
      workspace_root = params.workspace_map.get(state.workspace_name)!
    }

    const sanitized_file_path = create_safe_path(
      workspace_root,
      state.file_path
    )
    if (!sanitized_file_path) {
      continue
    }

    let current_content = ''
    try {
      if (fs.existsSync(sanitized_file_path)) {
        const document =
          await vscode.workspace.openTextDocument(sanitized_file_path)
        current_content = document.getText()
      }
    } catch (error) {
      continue
    }

    let new_content_for_diff = current_content
    if (state.is_checked === false && state.ai_content !== undefined) {
      current_content = state.ai_content
      new_content_for_diff = state.content
    }

    const hash = crypto
      .createHash('md5')
      .update(sanitized_file_path)
      .digest('hex')
    const temp_filename = `cwc-preview-${hash}.tmp`
    const temp_file_path = path.join(os.tmpdir(), temp_filename)

    const diff_stats = get_diff_stats({
      original_content: state.content,
      new_content: new_content_for_diff
    })
    const is_deleted =
      state.is_deleted ||
      (!state.is_new && current_content == '' && state.content != '')

    const reviewable_file: ReviewableFile = {
      type: 'file',
      file_path: state.file_path,
      content: current_content,
      workspace_name: state.workspace_name,
      is_new: state.is_new || !!state.file_path_to_restore,
      is_deleted,
      lines_added: diff_stats.lines_added,
      lines_removed: diff_stats.lines_removed,
      is_fallback: state.is_fallback,
      is_replaced: state.is_replaced,
      diff_fallback_method: state.diff_fallback_method,
      is_checked: state.is_checked ?? true
    }

    prepared_files.push({
      reviewable_file,
      sanitized_path: sanitized_file_path,
      original_content: state.content,
      temp_file_path,
      file_exists: !state.is_new
    })

    if (state.file_path_to_restore) {
      const restored_sanitized_file_path = create_safe_path(
        workspace_root,
        state.file_path_to_restore
      )
      if (!restored_sanitized_file_path) {
        continue
      }

      const restored_current_content = ''

      const restored_hash = crypto
        .createHash('md5')
        .update(restored_sanitized_file_path)
        .digest('hex')
      const restored_temp_filename = `cwc-preview-${restored_hash}.tmp`
      const restored_temp_file_path = path.join(
        os.tmpdir(),
        restored_temp_filename
      )

      const restored_diff_stats = get_diff_stats({
        original_content: state.content,
        new_content: restored_current_content
      })

      const restored_reviewable_file: ReviewableFile = {
        type: 'file',
        file_path: state.file_path_to_restore,
        content: restored_current_content,
        workspace_name: state.workspace_name,
        is_new: false,
        is_deleted: true,
        lines_added: restored_diff_stats.lines_added,
        lines_removed: restored_diff_stats.lines_removed,
        is_checked: state.is_checked ?? true
      }

      prepared_files.push({
        reviewable_file: restored_reviewable_file,
        sanitized_path: restored_sanitized_file_path,
        original_content: state.content,
        temp_file_path: restored_temp_file_path,
        file_exists: false
      })
    }
  }

  return prepared_files
}

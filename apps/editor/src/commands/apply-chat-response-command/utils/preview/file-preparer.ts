import * as fs from 'fs'
import * as crypto from 'crypto'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import * as vscode from 'vscode'
import { create_safe_path } from '@/utils/path-sanitizer'
import { get_diff_stats } from './diff-utils'
import { PreparedFile, PreviewableFile } from './types'

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
    let file_exists = false
    try {
      if (fs.existsSync(sanitized_file_path)) {
        file_exists = true
        current_content =
          state.current_content ??
          state.proposed_content ??
          fs.readFileSync(sanitized_file_path, 'utf8')
      } else if (state.current_content !== undefined) {
        current_content = state.current_content
      } else if (state.proposed_content !== undefined) {
        current_content = state.proposed_content
      }
    } catch (error) {
      continue
    }

    let new_content_for_diff = current_content
    if (state.is_checked === false && state.current_content !== undefined) {
      current_content = state.current_content
      new_content_for_diff = state.content
    } else if (state.is_checked === false && state.ai_content !== undefined) {
      current_content = state.ai_content
      new_content_for_diff = state.content
    }

    const hash = crypto
      .createHash('md5')
      .update(sanitized_file_path)
      .digest('hex')
    const original_uri = vscode.Uri.file(sanitized_file_path)
      .with({ scheme: 'cwc-preview', query: `hash=${hash}` })
      .toString()

    const original_content_for_diff = state.file_path_to_restore
      ? ''
      : state.content

    const diff_stats = get_diff_stats({
      original_content: original_content_for_diff,
      new_content: new_content_for_diff
    })
    const is_deleted =
      state.file_state == 'deleted' ||
      (state.file_state != 'new' && !file_exists && state.content != '')

    const previewable_file: PreviewableFile = {
      type: 'file',
      file_path: state.file_path,
      content: current_content,
      workspace_name: state.workspace_name,
      file_state: is_deleted
        ? 'deleted'
        : state.file_state == 'new' || !!state.file_path_to_restore
          ? 'new'
          : undefined,
      lines_added: diff_stats.lines_added,
      lines_removed: diff_stats.lines_removed,
      diff_application_method: state.diff_application_method,
      proposed_content: state.apply_failed
        ? state.content
        : (state.proposed_content ?? state.ai_content ?? current_content),
      is_checked: state.is_checked ?? true,
      apply_failed: state.apply_failed,
      ai_content: state.ai_content,
      applied_with_intelligent_update: state.applied_with_intelligent_update
    }

    prepared_files.push({
      previewable_file,
      sanitized_path: sanitized_file_path,
      original_content: original_content_for_diff,
      original_uri,
      file_exists: state.file_state != 'new'
    })

    if (state.file_path_to_restore) {
      let restore_workspace_root = params.default_workspace
      if (
        state.restore_workspace_name &&
        params.workspace_map.has(state.restore_workspace_name)
      ) {
        restore_workspace_root = params.workspace_map.get(
          state.restore_workspace_name
        )!
      }

      const restored_sanitized_file_path = create_safe_path(
        restore_workspace_root,
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
      const restored_original_uri = vscode.Uri.file(
        restored_sanitized_file_path
      )
        .with({ scheme: 'cwc-preview', query: `hash=${restored_hash}` })
        .toString()

      const restored_diff_stats = get_diff_stats({
        original_content: state.content,
        new_content: restored_current_content
      })

      const restored_previewable_file: PreviewableFile = {
        type: 'file',
        file_path: state.file_path_to_restore,
        content: restored_current_content,
        workspace_name: state.restore_workspace_name ?? state.workspace_name,
        file_state: 'deleted',
        lines_added: restored_diff_stats.lines_added,
        lines_removed: restored_diff_stats.lines_removed,
        proposed_content: restored_current_content,
        is_checked: state.is_checked ?? true
      }

      prepared_files.push({
        previewable_file: restored_previewable_file,
        sanitized_path: restored_sanitized_file_path,
        original_content: state.content,
        original_uri: restored_original_uri,
        file_exists: false
      })
    }
  }

  return prepared_files
}

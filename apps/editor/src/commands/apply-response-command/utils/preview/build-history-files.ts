import * as vscode from 'vscode'
import * as fs from 'fs'
import { FileInPreview } from '@shared/types/file-in-preview'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import {
  get_workspace_map_and_default,
  resolve_workspace_root
} from '../workspace'
import { create_safe_path } from '@/utils/path-sanitizer'
import { get_diff_stats } from './diff-utils'

export const build_history_files = async (params: {
  original_states: OriginalFileState[]
}): Promise<{
  files_for_history: FileInPreview[]
  total_lines_added: number
  total_lines_removed: number
}> => {
  let total_lines_added = 0
  let total_lines_removed = 0
  const files_for_history: FileInPreview[] = []

  const { workspace_map, default_workspace } = get_workspace_map_and_default()

  for (const state of params.original_states) {
    const workspace_root = resolve_workspace_root({
      workspace_name: state.workspace_name,
      workspace_map,
      default_workspace
    })

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
        if (state.proposed_content !== undefined) {
          current_content = state.proposed_content
        } else {
          const document =
            await vscode.workspace.openTextDocument(sanitized_file_path)
          current_content = document.getText()
        }
      } else if (state.proposed_content !== undefined) {
        current_content = state.proposed_content
      }
    } catch (error) {
      continue
    }

    const is_rename = !!state.file_path_to_restore

    const diff_stats = get_diff_stats({
      original_content: is_rename ? '' : state.content,
      new_content: current_content
    })

    total_lines_added += diff_stats.lines_added
    total_lines_removed += diff_stats.lines_removed

    const is_deleted =
      state.file_state != 'new' && !is_rename && !file_exists && state.content != ''

    files_for_history.push({
      type: 'file',
      file_path: state.file_path,
      workspace_name: state.workspace_name,
      file_state:
        state.file_state == 'new' || is_rename
          ? 'new'
          : is_deleted
            ? 'deleted'
            : undefined,
      lines_added: diff_stats.lines_added,
      lines_removed: diff_stats.lines_removed,
      diff_application_method: state.diff_application_method,
      content: current_content,
      proposed_content:
        state.proposed_content ?? state.ai_content ?? current_content,
      is_checked: true,
      apply_failed: state.apply_failed,
      ai_content: state.ai_content,
      applied_with_patch_repair: state.applied_with_patch_repair,
      added_in_preview: state.added_in_preview
    })

    if (state.file_path_to_restore) {
      const deleted_diff_stats = get_diff_stats({
        original_content: state.content,
        new_content: ''
      })

      total_lines_removed += deleted_diff_stats.lines_removed

      files_for_history.push({
        type: 'file',
        file_path: state.file_path_to_restore,
        workspace_name: state.restore_workspace_name ?? state.workspace_name,
        file_state: 'deleted',
        lines_added: 0,
        lines_removed: deleted_diff_stats.lines_removed,
        content: '',
        proposed_content: '',
        is_checked: true
      })
    }
  }

  return { files_for_history, total_lines_added, total_lines_removed }
}

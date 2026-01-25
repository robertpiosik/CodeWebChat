import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { setup_workspace_listeners } from './workspace-listener'
import { prepare_files_from_original_states } from './file-preparer'
import { parse_response } from '../clipboard-parser/clipboard-parser'
import {
  create_temp_files_with_original_content,
  cleanup_temp_files
} from './temp-file-manager'
import { close_preview_diff_editors, show_diff_with_actions } from './vscode-ui'
import { PreparedFile, PreviewableFile } from './types'
import { ItemInPreview } from '@shared/types/file-in-preview'

export { response_preview_promise_resolve } from './vscode-ui'
export { toggle_file_preview_state } from './workspace-listener'
export { discard_user_changes_in_preview } from './workspace-listener'
export { set_file_fixed_with_intelligent_update } from './workspace-listener'

export const preview = async (params: {
  original_states: OriginalFileState[]
  panel_provider: PanelProvider
  raw_instructions?: string
  chat_response: string
  context: vscode.ExtensionContext
  created_at?: number
}): Promise<{
  accepted_files: PreviewableFile[]
  rejected_states: OriginalFileState[]
  created_at?: number
  active_editor_state?: {
    file_path: string
    position: vscode.Position
  }
} | null> => {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_WORKSPACE_FOLDER_OPEN
    )
    return null
  }

  if (!params.original_states || params.original_states.length == 0) {
    return null
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  let prepared_files: PreparedFile[] = []
  let listener_disposer: { dispose: () => void } | undefined

  try {
    prepared_files = await prepare_files_from_original_states({
      original_states: params.original_states,
      default_workspace,
      workspace_map
    })

    const is_single_root_folder_workspace =
      (vscode.workspace.workspaceFolders?.length ?? 0) <= 1

    const clipboard_items = parse_response({
      response: params.chat_response,
      is_single_root_folder_workspace
    })

    const items_for_preview: ItemInPreview[] = []

    if (clipboard_items.length > 0) {
      const prepared_files_map = new Map<string, PreparedFile>()
      for (const pf of prepared_files) {
        const key = is_single_root_folder_workspace
          ? pf.previewable_file.file_path
          : `${pf.previewable_file.workspace_name || ''}:${
              pf.previewable_file.file_path
            }`
        prepared_files_map.set(key, pf)
      }

      for (const item of clipboard_items) {
        if (item.type == 'text') {
          items_for_preview.push({ type: 'text', content: item.content })
        } else if (item.type == 'inline-file') {
          items_for_preview.push({
            type: 'inline-file',
            content: item.content,
            language: item.language
          })
        } else if (
          item.type == 'file' ||
          item.type == 'diff' ||
          item.type == 'completion'
        ) {
          const key = is_single_root_folder_workspace
            ? item.file_path
            : `${item.workspace_name || ''}:${item.file_path}`
          const prepared_file = prepared_files_map.get(key)
          if (prepared_file) {
            items_for_preview.push(prepared_file.previewable_file)
            prepared_files_map.delete(key)
          }
          if (item.type == 'diff' && item.new_file_path) {
            const new_key = is_single_root_folder_workspace
              ? item.new_file_path
              : `${item.workspace_name || ''}:${item.new_file_path}`
            const new_prepared_file = prepared_files_map.get(new_key)
            if (new_prepared_file) {
              items_for_preview.push(new_prepared_file.previewable_file)
              prepared_files_map.delete(new_key)
            }
          }
        }
      }
      items_for_preview.push(
        ...[...prepared_files_map.values()].map((pf) => pf.previewable_file)
      )
    } else {
      items_for_preview.push(...prepared_files.map((p) => p.previewable_file))
    }

    if (params.panel_provider) {
      params.panel_provider.send_message({
        command: 'RESPONSE_PREVIEW_STARTED',
        items: items_for_preview,
        raw_instructions: params.raw_instructions,
        created_at: params.created_at
      })
    }

    if (prepared_files.length == 0) {
      return null
    }

    listener_disposer = setup_workspace_listeners(
      prepared_files,
      params.original_states,
      params.panel_provider,
      workspace_map,
      default_workspace,
      params.context,
      params.created_at
    )

    create_temp_files_with_original_content(prepared_files)

    const preview_items = prepared_files.map((file) => ({
      file,
      status: 'pending' as 'pending' | 'accepted' | 'rejected'
    }))

    let current_index = 0
    while (current_index >= 0 && current_index < preview_items.length) {
      const preview_item = preview_items[current_index]

      if (preview_item.status != 'pending') {
        current_index++
        continue
      }

      const result = await show_diff_with_actions(preview_item.file)

      if (prepared_files.length > preview_items.length) {
        const new_prepared_files = prepared_files.slice(preview_items.length)
        for (const pf of new_prepared_files) {
          preview_items.push({
            file: pf,
            status: 'pending'
          })
        }
      }

      preview_item.file.previewable_file.content = result.new_content
      const { decision } = result

      if ('accepted_files' in decision) {
        const has_unsaved_editors = vscode.workspace.textDocuments.some(
          (doc) => doc.isDirty
        )
        if (has_unsaved_editors) {
          await vscode.workspace.saveAll()
          await new Promise((resolve) => setTimeout(resolve, 500))
        }

        const accepted_files_info = decision.accepted_files
        const accepted_file_identifiers = new Set(
          accepted_files_info.map(
            (file) => `${file.workspace_name || ''}:${file.file_path}`
          )
        )

        const accepted_files = prepared_files
          .filter((pf) => {
            const identifier = `${pf.previewable_file.workspace_name || ''}:${
              pf.previewable_file.file_path
            }`
            return accepted_file_identifiers.has(identifier)
          })
          .map((pf) => pf.previewable_file)

        const rejected_states = prepared_files
          .filter((pf) => {
            const identifier = `${pf.previewable_file.workspace_name || ''}:${
              pf.previewable_file.file_path
            }`
            return !accepted_file_identifiers.has(identifier)
          })
          .map((item) => {
            return params.original_states.find(
              (state) =>
                state.file_path == item.previewable_file.file_path &&
                state.workspace_name == item.previewable_file.workspace_name
            )
          })
          .filter((state): state is OriginalFileState => state !== undefined)

        let active_editor_state:
          | { file_path: string; position: vscode.Position }
          | undefined

        if (result.active_file_path && result.active_position) {
          const active_path = result.active_file_path
          const matching_prepared = prepared_files.find(
            (pf) => pf.temp_file_path === active_path
          )

          active_editor_state = {
            file_path: matching_prepared
              ? matching_prepared.sanitized_path
              : active_path,
            position: result.active_position
          }
        }

        return {
          accepted_files,
          rejected_states,
          created_at: decision.created_at,
          active_editor_state
        }
      }

      if ('jump_to' in decision) {
        const jump_target = decision.jump_to
        const new_index = preview_items.findIndex(
          (item) =>
            item.file.previewable_file.file_path === jump_target.file_path &&
            item.file.previewable_file.workspace_name ===
              jump_target.workspace_name
        )

        if (new_index != -1) {
          if (preview_items[new_index].status != 'pending') {
            preview_items[new_index].status = 'pending'
          }
          current_index = new_index
        } else {
          current_index++
        }
        continue
      }
    }

    const accepted_files = preview_items
      .filter((item) => item.status == 'accepted')
      .map((item) => item.file.previewable_file)

    const rejected_items = preview_items.filter(
      (item) => item.status == 'rejected'
    )
    const rejected_states = rejected_items
      .map((item) => {
        return params.original_states.find(
          (state) =>
            state.file_path == item.file.previewable_file.file_path &&
            state.workspace_name == item.file.previewable_file.workspace_name
        )
      })
      .filter((state): state is OriginalFileState => state !== undefined)

    return { accepted_files, rejected_states }
  } finally {
    listener_disposer?.dispose()
    await close_preview_diff_editors(prepared_files)
    cleanup_temp_files(prepared_files)

    if (params.panel_provider) {
      params.panel_provider.cancel_all_intelligent_updates()
      params.panel_provider.send_message({
        command: 'RESPONSE_PREVIEW_FINISHED'
      })
    }
  }
}

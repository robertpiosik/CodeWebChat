import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { setup_workspace_listeners } from './workspace-listener'
import { prepare_files_from_original_states } from './file-preparer'
import {
  create_temp_files_with_original_content,
  cleanup_temp_files
} from './temp-file-manager'
import { close_review_diff_editors, show_diff_with_actions } from './vscode-ui'
import { PreparedFile, ReviewableFile } from './types'

export { code_review_promise_resolve } from './vscode-ui'
export { toggle_file_review_state } from './workspace-listener'

export const review = async (params: {
  original_states: OriginalFileState[]
  panel_provider: PanelProvider
  raw_instructions?: string
}): Promise<{
  accepted_files: ReviewableFile[]
  rejected_states: OriginalFileState[]
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

    if (params.panel_provider) {
      params.panel_provider.send_message({
        command: 'CODE_REVIEW_STARTED',
        files: prepared_files.map((p) => p.reviewable_file),
        raw_instructions: params.raw_instructions
      })
    }

    if (prepared_files.length === 0) {
      return null
    }

    listener_disposer = setup_workspace_listeners(
      prepared_files,
      params.original_states,
      params.panel_provider,
      workspace_map,
      default_workspace
    )

    create_temp_files_with_original_content(prepared_files)

    const review_items = prepared_files.map((file) => ({
      file,
      status: 'pending' as 'pending' | 'accepted' | 'rejected'
    }))

    let current_index = 0
    while (current_index >= 0 && current_index < review_items.length) {
      const review_item = review_items[current_index]

      if (review_item.status != 'pending') {
        current_index++
        continue
      }

      const result = await show_diff_with_actions(review_item.file)

      review_item.file.reviewable_file.content = result.new_content
      const { decision } = result

      if ('accepted_files' in decision) {
        await vscode.workspace.saveAll()

        const accepted_files_info = decision.accepted_files
        const accepted_file_identifiers = new Set(
          accepted_files_info.map(
            (file) => `${file.workspace_name || ''}:${file.file_path}`
          )
        )

        const accepted_files = prepared_files
          .filter((pf) => {
            const identifier = `${pf.reviewable_file.workspace_name || ''}:${
              pf.reviewable_file.file_path
            }`
            return accepted_file_identifiers.has(identifier)
          })
          .map((pf) => pf.reviewable_file)

        const rejected_states = prepared_files
          .filter((pf) => {
            const identifier = `${pf.reviewable_file.workspace_name || ''}:${
              pf.reviewable_file.file_path
            }`
            return !accepted_file_identifiers.has(identifier)
          })
          .map((item) => {
            return params.original_states.find(
              (state) =>
                state.file_path == item.reviewable_file.file_path &&
                state.workspace_name == item.reviewable_file.workspace_name
            )
          })
          .filter((state): state is OriginalFileState => state !== undefined)

        return { accepted_files, rejected_states }
      }

      if ('jump_to' in decision) {
        const jump_target = decision.jump_to
        const new_index = review_items.findIndex(
          (item) =>
            item.file.reviewable_file.file_path === jump_target.file_path &&
            item.file.reviewable_file.workspace_name ===
              jump_target.workspace_name
        )

        if (new_index != -1) {
          if (review_items[new_index].status != 'pending') {
            review_items[new_index].status = 'pending'
          }
          current_index = new_index
        } else {
          current_index++
        }
        continue
      }
    }

    const accepted_files = review_items
      .filter((item) => item.status == 'accepted')
      .map((item) => item.file.reviewable_file)

    const rejected_items = review_items.filter(
      (item) => item.status == 'rejected'
    )
    const rejected_states = rejected_items
      .map((item) => {
        return params.original_states.find(
          (state) =>
            state.file_path == item.file.reviewable_file.file_path &&
            state.workspace_name == item.file.reviewable_file.workspace_name
        )
      })
      .filter((state): state is OriginalFileState => state !== undefined)

    return { accepted_files, rejected_states }
  } finally {
    listener_disposer?.dispose()
    await close_review_diff_editors(prepared_files)
    cleanup_temp_files(prepared_files)

    if (params.panel_provider) {
      params.panel_provider.cancel_all_intelligent_updates()
      params.panel_provider.send_message({ command: 'CODE_REVIEW_FINISHED' })
    }
  }
}

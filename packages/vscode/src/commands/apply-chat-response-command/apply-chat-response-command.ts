import * as vscode from 'vscode'
import * as fs from 'fs'
import {
  create_checkpoint,
  delete_checkpoint
} from '../checkpoints-command/actions'
import { FileInPreview } from '@shared/types/file-in-preview'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { response_preview_promise_resolve } from './utils/preview/preview'
import { get_diff_stats } from './utils/preview/diff-utils'
import { create_safe_path } from '@/utils/path-sanitizer'
import {
  preview_handler,
  ongoing_review_cleanup_promise
} from './utils/preview-handler'
import { process_chat_response, CommandArgs } from './response-processor'
import { Checkpoint } from '../checkpoints-command/types'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'

let in_progress = false

export const apply_chat_response_command = (
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.applyChatResponse',
    async (args?: CommandArgs) => {
      if (!vscode.workspace.workspaceFolders?.length) {
        vscode.window.showErrorMessage(
          dictionary.error_message.NO_WORKSPACE_FOLDER_OPEN
        )
        return
      }

      let chat_response = args?.response
      if (chat_response === undefined) {
        chat_response = await vscode.env.clipboard.readText()
        if (!chat_response) {
          vscode.window.showInformationMessage(
            dictionary.information_message.CLIPBOARD_IS_EMPTY
          )
          return
        }
      } else if (!chat_response) {
        vscode.window.showErrorMessage(
          dictionary.error_message.RESPONSE_TEXT_MISSING
        )
        return
      }

      if (in_progress) {
        panel_provider.send_message({
          command: 'NEW_RESPONSE_RECEIVED',
          response: chat_response,
          raw_instructions: args?.raw_instructions
        })
      }

      if (in_progress && !response_preview_promise_resolve) {
        // Running intelligent update before response preview...
        return
      }
      in_progress = true

      if (response_preview_promise_resolve) {
        // Previewing response...
        const choice = await vscode.window.showInformationMessage(
          dictionary.warning_message.PREVIEW_ONGOING,
          'Switch'
        )

        if (choice == 'Switch') {
          response_preview_promise_resolve({ accepted_files: [] })
          if (ongoing_review_cleanup_promise) {
            await ongoing_review_cleanup_promise
          }
          await new Promise((r) => setTimeout(r, 500)) // Wait for all fileystem operation to finish
        } else {
          return
        }
      }

      let before_checkpoint: Checkpoint | undefined
      try {
        before_checkpoint = await create_checkpoint(
          workspace_provider,
          context,
          'Before response previewed',
          args?.raw_instructions
        )

        if (!before_checkpoint) {
          return
        }
        const review_data = await process_chat_response(
          args,
          chat_response,
          context,
          panel_provider
        )

        if (review_data) {
          if (!args?.files_with_content) {
            let total_lines_added = 0
            let total_lines_removed = 0
            const files_for_history: FileInPreview[] = []

            const workspace_map = new Map<string, string>()
            vscode.workspace.workspaceFolders!.forEach((folder) => {
              workspace_map.set(folder.name, folder.uri.fsPath)
            })
            const default_workspace =
              vscode.workspace.workspaceFolders![0].uri.fsPath

            for (const state of review_data.original_states) {
              let workspace_root = default_workspace
              if (
                state.workspace_name &&
                workspace_map.has(state.workspace_name)
              ) {
                workspace_root = workspace_map.get(state.workspace_name)!
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
                  current_content = fs.readFileSync(sanitized_file_path, 'utf8')
                }
              } catch (error) {
                continue
              }

              const diff_stats = get_diff_stats({
                original_content: state.content,
                new_content: current_content
              })

              total_lines_added += diff_stats.lines_added
              total_lines_removed += diff_stats.lines_removed

              const is_deleted =
                !state.is_new && current_content === '' && state.content !== ''

              files_for_history.push({
                file_path: state.file_path,
                workspace_name: state.workspace_name,
                is_new: state.is_new,
                is_deleted,
                lines_added: diff_stats.lines_added,
                lines_removed: diff_stats.lines_removed,
                is_fallback: state.is_fallback,
                is_replaced: state.is_replaced,
                diff_fallback_method: state.diff_fallback_method,
                content: current_content,
                is_checked: true
              })
            }

            panel_provider.send_message({
              command: 'NEW_RESPONSE_RECEIVED',
              response: review_data.chat_response,
              raw_instructions: args?.raw_instructions,
              lines_added: total_lines_added,
              lines_removed: total_lines_removed,
              files: files_for_history
            })
          }

          const changes_accepted = await preview_handler({
            original_states: review_data.original_states,
            chat_response: review_data.chat_response,
            panel_provider,
            context,
            original_editor_state: args?.original_editor_state,
            raw_instructions: args?.raw_instructions
          })

          if (changes_accepted) {
            if (before_checkpoint) {
              const checkpoints =
                context.workspaceState.get<Checkpoint[]>(
                  CHECKPOINTS_STATE_KEY,
                  []
                ) ?? []
              const checkpoint_to_update = checkpoints.find(
                (c) => c.timestamp == before_checkpoint!.timestamp
              )
              if (checkpoint_to_update) {
                checkpoint_to_update.title = 'Before changes approved'
                await context.workspaceState.update(
                  CHECKPOINTS_STATE_KEY,
                  checkpoints
                )
              }
            }

            await create_checkpoint(
              workspace_provider,
              context,
              'After changes approved',
              args?.raw_instructions
            )
            before_checkpoint = undefined
          }
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `An error occurred while applying changes: ${err.message}`
        )
      } finally {
        in_progress = false
        if (before_checkpoint) {
          delete_checkpoint({
            context,
            checkpoint_to_delete: before_checkpoint
          })
        }
      }
    }
  )
}

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { create_checkpoint } from '../checkpoints-command/actions'
import { FileInReview } from '@shared/types/file-in-review'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { code_review_promise_resolve } from './utils/review/review'
import { get_diff_stats } from './utils/review/diff-utils'
import { create_safe_path } from '@/utils/path-sanitizer'
import {
  handle_code_review_and_cleanup,
  ongoing_review_cleanup_promise
} from './utils/review-handler'
import { process_chat_response, CommandArgs } from './response-processor'
import { undo_files } from './utils/file-operations'

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

      if (code_review_promise_resolve) {
        const choice = await vscode.window.showWarningMessage(
          dictionary.warning_message.REVIEW_ONGOING,
          { modal: true },
          'Switch'
        )

        if (choice == 'Switch') {
          code_review_promise_resolve({ accepted_files: [] })
          if (ongoing_review_cleanup_promise) {
            await ongoing_review_cleanup_promise
          }
          await new Promise((r) => setTimeout(r, 500)) // Wait for all fileystem operation to finish
        } else {
          return
        }
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
          const files_for_history: FileInReview[] = []

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
              content: current_content
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

        const changes_accepted = await handle_code_review_and_cleanup({
          original_states: review_data.original_states,
          chat_response: review_data.chat_response,
          panel_provider,
          context,
          original_editor_state: args?.original_editor_state,
          raw_instructions: args?.raw_instructions
        })

        if (changes_accepted) {
          const workspace_map = new Map<string, string>()
          vscode.workspace.workspaceFolders!.forEach((folder) => {
            workspace_map.set(folder.name, folder.uri.fsPath)
          })
          const default_workspace =
            vscode.workspace.workspaceFolders![0].uri.fsPath

          const accepted_states: {
            file_path: string
            workspace_name?: string
            content: string
            is_deleted: boolean
          }[] = []

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

            const exists = fs.existsSync(sanitized_file_path)
            const content = exists
              ? fs.readFileSync(sanitized_file_path, 'utf8')
              : ''

            accepted_states.push({
              file_path: state.file_path,
              workspace_name: state.workspace_name,
              content: content,
              is_deleted: !exists
            })
          }

          await undo_files({ original_states: review_data.original_states })

          await create_checkpoint(
            workspace_provider,
            context,
            'Before changes approved',
            args?.raw_instructions
          )

          for (const accepted_state of accepted_states) {
            let workspace_root = default_workspace
            if (
              accepted_state.workspace_name &&
              workspace_map.has(accepted_state.workspace_name)
            ) {
              workspace_root = workspace_map.get(accepted_state.workspace_name)!
            }
            const sanitized_file_path = create_safe_path(
              workspace_root,
              accepted_state.file_path
            )
            if (!sanitized_file_path) continue

            if (accepted_state.is_deleted) {
              if (fs.existsSync(sanitized_file_path)) {
                await vscode.workspace.fs.delete(
                  vscode.Uri.file(sanitized_file_path)
                )
              }
            } else {
              const dir = path.dirname(sanitized_file_path)
              if (!fs.existsSync(dir)) {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir))
              }
              await vscode.workspace.fs.writeFile(
                vscode.Uri.file(sanitized_file_path),
                Buffer.from(accepted_state.content, 'utf8')
              )
            }
          }
        }
      }
    }
  )
}

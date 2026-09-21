import * as vscode from 'vscode'
import {
  accept_checkpoint,
  create_checkpoint,
  delete_checkpoint
} from '@/features/checkpoints/actions'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { get_response_preview_promise_resolve } from './utils/preview'
import { build_history_files } from './utils/preview/build-history-files'
import {
  preview_handler,
  ongoing_preview_cleanup_promise
} from './utils/preview-handler'
import {
  process_response,
  ApplyResponseCommandArgs
} from './response-processor'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { PromptViewApiCallsManager } from '@/services/prompt-view-api-calls-manager'
import { t } from '@/i18n'
import {
  preview_document_provider,
  CwcPreviewProvider
} from './utils/preview/virtual-document-provider'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { parse_response, PatchRepairItem } from './utils/response-parser'
import { Checkpoint } from '@/features/checkpoints/types'
import { WebSocketManager } from '@/services/websocket-manager'
import { handle_patch_repair } from './response-processor/handlers/patch-repair-handler'
import {
  capture_tab_groups,
  restore_tab_groups,
  SavedTabGroups
} from './utils/tab-group-manager'

let in_progress = false
let initialization_mutex = Promise.resolve()
let command_lifecycle_promise: Promise<void> | null = null
let resolve_command_lifecycle: (() => void) | null = null

export const apply_response_command = (params: {
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  workspace_provider: WorkspaceProvider
  prompt_view_api_calls_manager: PromptViewApiCallsManager
  websocket_manager: WebSocketManager
}) => {
  params.extension_context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      CwcPreviewProvider.scheme,
      preview_document_provider
    )
  )

  return vscode.commands.registerCommand(
    'codeWebChat.applyResponse',
    async (args?: ApplyResponseCommandArgs) => {
      const previous_mutex = initialization_mutex
      let release_mutex!: () => void
      initialization_mutex = new Promise((resolve) => {
        release_mutex = resolve
      })

      await previous_mutex

      let response: string | undefined
      let response_items: ReturnType<typeof parse_response> = []
      let is_intelligent_file_search_results = false
      let is_code_at_cursor = false

      try {
        if (!vscode.workspace.workspaceFolders?.length) {
          vscode.window.showErrorMessage(
            t('command.apply-response-command.error.no-workspace-folder')
          )
          return
        }

        response = args?.response
        if (response === undefined) {
          response = await vscode.env.clipboard.readText()
          if (!response) {
            vscode.window.showInformationMessage(
              t('command.apply-response-command.info.clipboard-empty')
            )
            return
          }
        } else if (!response) {
          vscode.window.showErrorMessage(
            t('command.apply-response-command.error.response-missing')
          )
          return
        }

        while (in_progress && !get_response_preview_promise_resolve()) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        const resolve_fn = get_response_preview_promise_resolve()

        const is_single_root_folder_workspace =
          (vscode.workspace.workspaceFolders?.length ?? 0) <= 1

        const workspace_files = await get_all_workspace_files({
          workspace_provider: params.workspace_provider
        })

        response_items = parse_response({
          response,
          is_single_root_folder_workspace,
          workspace_files
        })

        const commit_message_item = response_items.find(
          (i) => i.type == 'commit-message'
        ) as any

        if (commit_message_item) {
          await vscode.commands.executeCommand(
            'codeWebChat.internal.generateCommitMessageWithProvidedTextAndCommit',
            commit_message_item.message
          )
          return
        }

        is_intelligent_file_search_results = response_items.some(
          (i) => i.type == 'intelligent-file-search-results'
        )

        const patch_repair_items = response_items.filter(
          (item): item is PatchRepairItem => item.type == 'patch-repair'
        )

        if (patch_repair_items.length > 0) {
          if (!resolve_fn) {
            return
          }

          await handle_patch_repair({
            patch_items: patch_repair_items,
            prompt_view_provider: params.prompt_view_provider,
            workspace_provider: params.workspace_provider
          })
          return
        }

        is_code_at_cursor = response_items.some(
          (item) => item.type == 'code-at-cursor'
        )

        if (is_code_at_cursor) {
          const item = response_items.find(
            (i) => i.type == 'code-at-cursor'
          ) as any

          await vscode.commands.executeCommand(
            'codeWebChat.internal.applyCodeAtCursor',
            {
              file_path: item.file_path,
              workspace_name: item.workspace_name,
              line: item.line,
              character: item.character,
              content: item.content
            }
          )
          return
        }

        if (resolve_fn && !is_intelligent_file_search_results) {
          const history = params.prompt_view_provider.response_history

          let created_at_for_switch: number

          if (!args?.created_at) {
            const new_item: ResponseHistoryItem = {
              response,
              raw_instructions: args?.raw_instructions,
              created_at: Date.now(),
              recent_api_configuration: args?.recent_api_configuration,
              is_not_looked_at: true
            }

            created_at_for_switch = new_item.created_at
            history.push(new_item)
            params.prompt_view_provider.send_message({
              command: 'RESPONSE_HISTORY',
              history
            })
          } else {
            created_at_for_switch = args.created_at
          }

          if (params.prompt_view_provider.preview_switch_choice_resolver) {
            return
          }

          const choice = await new Promise<'Switch' | undefined>((resolve) => {
            params.prompt_view_provider.preview_switch_choice_resolver = resolve
            params.prompt_view_provider.show_preview_ongoing_modal()
          })
          params.prompt_view_provider.preview_switch_choice_resolver = undefined

          if (choice == 'Switch') {
            args = { ...args, created_at: created_at_for_switch }
            resolve_fn({ accepted_files: [] })
            if (ongoing_preview_cleanup_promise) {
              await ongoing_preview_cleanup_promise
            }
            if (command_lifecycle_promise) {
              await command_lifecycle_promise
            }
          } else {
            return
          }
        }

        in_progress = true
      } finally {
        release_mutex()
      }

      command_lifecycle_promise = new Promise((resolve) => {
        resolve_command_lifecycle = resolve
      })

      if (args?.created_at) {
        const target_created_at = args.created_at
        const history = params.prompt_view_provider.response_history
        const existing = history.find((i) => i.created_at === target_created_at)
        if (existing && existing.is_not_looked_at !== false) {
          existing.is_not_looked_at = false
          params.prompt_view_provider.send_message({
            command: 'RESPONSE_HISTORY',
            history
          })
        }
      }

      let before_checkpoint: Checkpoint | undefined
      let saved_tab_groups: SavedTabGroups | undefined

      try {
        if (!is_intelligent_file_search_results) {
          // Save current tab groups before entering preview
          saved_tab_groups = capture_tab_groups()

          const has_valid_blocks =
            (args?.files_with_content && args.files_with_content.length > 0) ||
            response_items.some(
              (item) => item.type == 'file' || item.type == 'diff'
            )

          if (has_valid_blocks && !is_code_at_cursor) {
            params.prompt_view_provider.send_message({
              command: 'SHOW_PROGRESS',
              title: t('common.progress.response-preview'),
              subtitle: t('common.progress.creating-checkpoint')
            })

            before_checkpoint = await create_checkpoint({
              workspace_provider: params.workspace_provider,
              extension_context: params.extension_context,
              prompt_view_provider: params.prompt_view_provider,
              trigger: 'before-response-previewed',
              description: args?.raw_instructions,
              hide_notification: true
            })
          }
        }

        const preview_data = await process_response({
          args,
          response: response!,
          response_items,
          extension_context: params.extension_context,
          prompt_view_provider: params.prompt_view_provider,
          workspace_provider: params.workspace_provider,
          websocket_manager: params.websocket_manager
        })

        if (!preview_data) {
          params.prompt_view_provider.send_message({
            command: 'HIDE_PROGRESS'
          })
        }

        if (preview_data) {
          let created_at_for_preview = args?.created_at
          if (!args?.files_with_content) {
            const {
              files_for_history,
              total_lines_added,
              total_lines_removed
            } = await build_history_files({
              original_states: preview_data.original_states
            })
            const history = params.prompt_view_provider.response_history

            const item_to_update =
              args?.created_at &&
              history.find((i) => i.created_at === args.created_at)

            if (item_to_update) {
              item_to_update.files = files_for_history
              item_to_update.lines_added = total_lines_added
              item_to_update.lines_removed = total_lines_removed
            } else {
              created_at_for_preview = Date.now()
              const new_item: ResponseHistoryItem = {
                response: preview_data.response,
                raw_instructions: args?.raw_instructions,
                created_at: created_at_for_preview,
                lines_added: total_lines_added,
                lines_removed: total_lines_removed,
                files: files_for_history,
                recent_api_configuration: args?.recent_api_configuration
              }

              history.push(new_item)
            }

            params.prompt_view_provider.send_message({
              command: 'RESPONSE_HISTORY',
              history
            })
          }

          const history_for_checkpoint = [
            ...params.prompt_view_provider.response_history
          ]
          const changes_accepted = await preview_handler({
            original_states: preview_data.original_states,
            chat_response: preview_data.response,
            prompt_view_provider: params.prompt_view_provider,
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context,
            original_editor_state: args?.original_editor_state,
            raw_instructions: args?.raw_instructions,
            created_at: created_at_for_preview,
            recent_api_configuration: args?.recent_api_configuration,
            is_code_at_cursor
          })

          if (changes_accepted) {
            params.prompt_view_api_calls_manager.cancel_all_requests()
            if (before_checkpoint) {
              await accept_checkpoint({
                extension_context: params.extension_context,
                checkpoint: before_checkpoint,
                history_for_checkpoint,
                created_at_for_preview
              })
            }

            before_checkpoint = undefined
          } else if (saved_tab_groups) {
            await restore_tab_groups(saved_tab_groups)
          }
        }
      } catch (err: any) {
        params.prompt_view_provider.send_message({
          command: 'HIDE_PROGRESS'
        })
        vscode.window.showErrorMessage(
          t('command.apply-response-command.error.applying-changes', {
            msg: err.message
          })
        )
      } finally {
        in_progress = false
        if (before_checkpoint) {
          delete_checkpoint({
            extension_context: params.extension_context,
            prompt_view_provider: params.prompt_view_provider,
            checkpoint_to_delete: before_checkpoint
          })
        }
        if (resolve_command_lifecycle) {
          resolve_command_lifecycle()
          resolve_command_lifecycle = null
          command_lifecycle_promise = null
        }
      }
    }
  )
}

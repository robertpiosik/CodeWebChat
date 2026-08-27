import * as vscode from 'vscode'
import * as fs from 'fs'
import {
  create_checkpoint,
  delete_checkpoint
} from '@/features/checkpoints/actions'
import { FileInPreview } from '@shared/types/file-in-preview'
import { get_checkpoint_path } from '@/features/checkpoints/utils'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { get_response_preview_promise_resolve } from './utils/preview'
import { get_diff_stats } from './utils/preview/diff-utils'
import { create_safe_path } from '@/utils/path-sanitizer'
import {
  preview_handler,
  ongoing_preview_cleanup_promise
} from './utils/preview-handler'
import {
  process_response,
  ApplyResponseCommandArgs
} from './response-processor'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { PromptViewApiCallsManager } from '@/services/prompt-view-api-calls-manager'
import { t } from '@/i18n'
import {
  preview_document_provider,
  CwcPreviewProvider
} from './utils/preview/virtual-document-provider'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { parse_response } from './utils/response-parser'
import { Checkpoint } from '@/features/checkpoints/types'
import { WebSocketManager } from '@/services/websocket-manager'

let in_progress = false

interface SavedEditorState {
  uri: string
  view_column: vscode.ViewColumn
  is_active: boolean
}

interface SavedTabGroups {
  editors: SavedEditorState[]
  active_editor_uri?: string
}

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
      if (!vscode.workspace.workspaceFolders?.length) {
        vscode.window.showErrorMessage(
          t('command.apply-response.error.no-workspace-folder')
        )
        return
      }

      let response = args?.response
      if (response === undefined) {
        response = await vscode.env.clipboard.readText()
        if (!response) {
          vscode.window.showInformationMessage(
            t('command.apply-response.info.clipboard-empty')
          )
          return
        }
      } else if (!response) {
        vscode.window.showErrorMessage(
          t('command.apply-response.error.response-missing')
        )
        return
      }

      if (response.trim().startsWith('**Commit message:**')) {
        const commit_message = response
          .trim()
          .substring('**Commit message:**'.length)
          .trim()
        await vscode.commands.executeCommand(
          'codeWebChat.internal.generateCommitMessageWithProvidedTextAndCommit',
          commit_message
        )
        return
      }

      const resolve_fn = get_response_preview_promise_resolve()

      if (in_progress && !resolve_fn) {
        return
      }

      const is_single_root_folder_workspace =
        (vscode.workspace.workspaceFolders?.length ?? 0) <= 1

      const workspace_files = await get_all_workspace_files({
        workspace_provider: params.workspace_provider
      })

      const response_items = parse_response({
        response,
        is_single_root_folder_workspace,
        workspace_files
      })

      const is_intelligent_file_search_results = response_items.some(
        (i) => i.type == 'intelligent-file-search-results'
      )

      const is_code_at_cursor = response_items.some(
        (item) => item.type == 'code-at-cursor'
      )

      if (resolve_fn && !is_intelligent_file_search_results) {
        const history = params.prompt_view_provider.response_history

        let created_at_for_switch: number

        if (!args?.created_at) {
          const new_item: ResponseHistoryItem = {
            response,
            raw_instructions: args?.raw_instructions,
            created_at: Date.now(),
            url: args?.url,
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
          // The "switch preview" modal is already visible for a previous
          // response. The current response has been added to the history,
          // so we can just return and avoid showing a second modal.
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
          await new Promise((r) => setTimeout(r, 500)) // Wait for all fileystem operation to finish
        } else {
          return
        }
      }

      in_progress = true

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
          saved_tab_groups = {
            editors: [],
            active_editor_uri:
              vscode.window.activeTextEditor?.document.uri.toString()
          }

          for (const tab_group of vscode.window.tabGroups.all) {
            for (const tab of tab_group.tabs) {
              if (tab.input instanceof vscode.TabInputText) {
                saved_tab_groups.editors.push({
                  uri: tab.input.uri.toString(),
                  view_column: tab_group.viewColumn,
                  is_active: tab.isActive
                })
              }
            }
          }

          const has_valid_blocks =
            (args?.files_with_content && args.files_with_content.length > 0) ||
            response_items.some(
              (item) => item.type == 'file' || item.type == 'diff'
            )

          if (has_valid_blocks && !is_code_at_cursor) {
            params.prompt_view_provider.send_message({
              command: 'SHOW_PROGRESS',
              title: t('common.progress.preparing-preview')
            })

            before_checkpoint = await create_checkpoint({
              workspace_provider: params.workspace_provider,
              extension_context: params.extension_context,
              prompt_view_provider: params.prompt_view_provider,
              trigger: 'before-response-previewed',
              description: args?.raw_instructions
            })
          }
        }

        const preview_data = await process_response({
          args,
          response,
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
            let total_lines_added = 0
            let total_lines_removed = 0
            const files_for_history: FileInPreview[] = []

            const workspace_map = new Map<string, string>()
            vscode.workspace.workspaceFolders!.forEach((folder) => {
              workspace_map.set(folder.name, folder.uri.fsPath)
            })
            const default_workspace =
              vscode.workspace.workspaceFolders![0].uri.fsPath

            for (const state of preview_data.original_states) {
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
              let file_exists = false
              try {
                if (fs.existsSync(sanitized_file_path)) {
                  file_exists = true
                  if (state.proposed_content !== undefined) {
                    current_content = state.proposed_content
                  } else {
                    const document =
                      await vscode.workspace.openTextDocument(
                        sanitized_file_path
                      )
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
                state.file_state != 'new' && !file_exists && state.content != ''

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
                applied_with_intelligent_update:
                  state.applied_with_intelligent_update
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
                  workspace_name:
                    state.restore_workspace_name ?? state.workspace_name,
                  file_state: 'deleted',
                  lines_added: 0,
                  lines_removed: deleted_diff_stats.lines_removed,
                  content: '',
                  proposed_content: '',
                  is_checked: true
                })
              }
            }
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
                url: args?.url,
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
            url: args?.url,
            recent_api_configuration: args?.recent_api_configuration,
            is_code_at_cursor
          })

          if (changes_accepted) {
            params.prompt_view_api_calls_manager.cancel_all_requests()
            if (before_checkpoint) {
              const checkpoints =
                params.extension_context.workspaceState.get<Checkpoint[]>(
                  CHECKPOINTS_STATE_KEY,
                  []
                ) ?? []
              const checkpoint_index = checkpoints.findIndex(
                (c) => c.timestamp == before_checkpoint!.timestamp
              )
              if (checkpoint_index != -1) {
                const checkpoint_to_update = checkpoints[checkpoint_index]
                const old_timestamp = checkpoint_to_update.timestamp
                const new_timestamp = Date.now()
                const old_path = get_checkpoint_path(old_timestamp)
                const new_path = get_checkpoint_path(new_timestamp)
                try {
                  await vscode.workspace.fs.rename(
                    vscode.Uri.file(old_path),
                    vscode.Uri.file(new_path)
                  )
                  checkpoint_to_update.timestamp = new_timestamp
                } catch (err) {
                  console.error(
                    `Failed to rename checkpoint directory for timestamp update:`,
                    err
                  )
                }
                checkpoint_to_update.trigger = 'response-accepted'
                checkpoint_to_update.response_history = history_for_checkpoint
                checkpoint_to_update.response_preview_item_created_at =
                  created_at_for_preview

                checkpoints.sort((a, b) => b.timestamp - a.timestamp)

                await params.extension_context.workspaceState.update(
                  CHECKPOINTS_STATE_KEY,
                  checkpoints
                )
              }
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
          t('command.apply-response.error.applying-changes', {
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
      }
    }
  )
}

const restore_tab_groups = async (
  saved_state: SavedTabGroups
): Promise<void> => {
  try {
    const current_editors: SavedEditorState[] = []
    for (const tab_group of vscode.window.tabGroups.all) {
      for (const tab of tab_group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          current_editors.push({
            uri: tab.input.uri.toString(),
            view_column: tab_group.viewColumn,
            is_active: tab.isActive
          })
        }
      }
    }

    const are_states_equal =
      current_editors.length == saved_state.editors.length &&
      current_editors.every((editor) =>
        saved_state.editors.some((saved) => saved.uri == editor.uri)
      )

    if (are_states_equal) {
      if (saved_state.active_editor_uri) {
        const current_active_uri =
          vscode.window.activeTextEditor?.document.uri.toString()
        if (current_active_uri != saved_state.active_editor_uri) {
          try {
            const active_uri = vscode.Uri.parse(saved_state.active_editor_uri)
            await vscode.window.showTextDocument(active_uri, {
              preserveFocus: false
            })
          } catch (error) {
            console.error('Failed to restore active editor focus:', error)
          }
        }
      }
      return
    }

    if (current_editors.length > saved_state.editors.length) {
      const tabs_to_close: vscode.Tab[] = []
      for (const tab_group of vscode.window.tabGroups.all) {
        for (const tab of tab_group.tabs) {
          if (tab.input instanceof vscode.TabInputText) {
            const uri = tab.input.uri.toString()
            const is_saved = saved_state.editors.some(
              (saved) =>
                saved.uri == uri && saved.view_column == tab_group.viewColumn
            )
            if (!is_saved) {
              tabs_to_close.push(tab)
            }
          }
        }
      }
      if (tabs_to_close.length > 0) {
        await vscode.window.tabGroups.close(tabs_to_close)
      }
    } else {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors')

      for (const editor of saved_state.editors) {
        try {
          const uri = vscode.Uri.parse(editor.uri)
          await vscode.window.showTextDocument(uri, {
            viewColumn: editor.view_column,
            preview: false,
            preserveFocus: !editor.is_active
          })
        } catch (error) {
          console.error(`Failed to restore editor for ${editor.uri}:`, error)
        }
      }
    }

    if (saved_state.active_editor_uri) {
      try {
        const active_uri = vscode.Uri.parse(saved_state.active_editor_uri)
        await vscode.window.showTextDocument(active_uri, {
          preserveFocus: false
        })
      } catch (error) {
        console.error('Failed to restore active editor:', error)
      }
    }
  } catch (error) {
    console.error('Failed to restore tab groups:', error)
  }
}

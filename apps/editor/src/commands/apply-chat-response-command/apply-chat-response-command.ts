import * as vscode from 'vscode'
import * as fs from 'fs'
import {
  create_checkpoint,
  delete_checkpoint
} from '../checkpoints-command/actions'
import { FileInPreview } from '@shared/types/file-in-preview'
import { get_checkpoint_path } from '../checkpoints-command/utils'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { response_preview_promise_resolve } from './utils/preview/preview'
import { get_diff_stats } from './utils/preview/diff-utils'
import { create_safe_path } from '@/utils/path-sanitizer'
import {
  preview_handler,
  ongoing_preview_cleanup_promise
} from './utils/preview-handler'
import { process_chat_response, CommandArgs } from './response-processor'
import { Checkpoint } from '../checkpoints-command/types'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { ApiManager } from '@/services/api-manager'
import { parse_response } from './utils/clipboard-parser/clipboard-parser'

let in_progress = false
let placeholder_created_at_for_update: number | undefined

interface SavedEditorState {
  uri: string
  view_column: vscode.ViewColumn
  is_active: boolean
}

interface SavedTabGroups {
  editors: SavedEditorState[]
  active_editor_uri?: string
}

export const apply_chat_response_command = (params: {
  context: vscode.ExtensionContext
  panel_provider: PanelProvider
  workspace_provider: WorkspaceProvider
  api_manager: ApiManager
}) => {
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

      if (in_progress && !response_preview_promise_resolve) {
        return
      }

      if (response_preview_promise_resolve) {
        const history = params.panel_provider.response_history

        const new_item: ResponseHistoryItem = {
          response: chat_response,
          raw_instructions: args?.raw_instructions,
          created_at: Date.now(),
          url: args?.url
        }

        history.push(new_item)
        params.panel_provider.send_message({
          command: 'RESPONSE_HISTORY',
          history
        })

        if (params.panel_provider.preview_switch_choice_resolver) {
          // The "switch preview" modal is already visible for a previous
          // response. The current response has been added to the history,
          // so we can just return and avoid showing a second modal.
          return
        }

        const choice = await new Promise<'Switch' | undefined>((resolve) => {
          params.panel_provider.preview_switch_choice_resolver = resolve
          params.panel_provider.send_message({
            command: 'SHOW_PREVIEW_ONGOING_MODAL'
          })
        })
        params.panel_provider.preview_switch_choice_resolver = undefined

        if (choice == 'Switch') {
          placeholder_created_at_for_update = new_item.created_at
          response_preview_promise_resolve({ accepted_files: [] })
          if (ongoing_preview_cleanup_promise) {
            await ongoing_preview_cleanup_promise
          }
          await new Promise((r) => setTimeout(r, 500)) // Wait for all fileystem operation to finish
        } else {
          return
        }
      }

      in_progress = true
      let before_checkpoint: Checkpoint | undefined
      let saved_tab_groups: SavedTabGroups | undefined

      try {
        const is_single_root_folder_workspace =
          vscode.workspace.workspaceFolders?.length == 1

        const parsed_items = args?.files_with_content
          ? []
          : parse_response({
              response: chat_response,
              is_single_root_folder_workspace
            })

        const file_count = args?.files_with_content
          ? args.files_with_content.length
          : parsed_items.filter(
              (item) =>
                item.type == 'diff' ||
                item.type == 'file' ||
                item.type == 'code-at-cursor'
            ).length

        if (file_count > 0) {
          params.panel_provider.send_message({
            command: 'SHOW_PROGRESS',
            title: 'Preparing response preview...',
            show_elapsed_time: false,
            delay_visibility: file_count < 5,
            cancellable: false
          })
        }

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

        before_checkpoint = await create_checkpoint(
          params.workspace_provider,
          params.context,
          params.panel_provider,
          'Before response previewed',
          args?.raw_instructions
        )

        const preview_data = await process_chat_response(
          args,
          chat_response,
          params.context,
          params.panel_provider,
          params.workspace_provider
        )

        params.panel_provider.send_message({
          command: 'HIDE_PROGRESS'
        })

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
                  const document =
                    await vscode.workspace.openTextDocument(sanitized_file_path)
                  current_content = document.getText()
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
                  workspace_name: state.workspace_name,
                  file_state: 'deleted',
                  lines_added: 0,
                  lines_removed: deleted_diff_stats.lines_removed,
                  content: '',
                  is_checked: true
                })
              }
            }
            const history = params.panel_provider.response_history

            if (placeholder_created_at_for_update) {
              const item_to_update = history.find(
                (i) => i.created_at === placeholder_created_at_for_update
              )
              if (item_to_update) {
                item_to_update.files = files_for_history
                item_to_update.lines_added = total_lines_added
                item_to_update.lines_removed = total_lines_removed
              }
              created_at_for_preview = placeholder_created_at_for_update
              placeholder_created_at_for_update = undefined
            } else {
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
                  response: preview_data.chat_response,
                  raw_instructions: args?.raw_instructions,
                  created_at: created_at_for_preview,
                  lines_added: total_lines_added,
                  lines_removed: total_lines_removed,
                  files: files_for_history,
                  url: args?.url
                }

                history.push(new_item)
              }
            }

            params.panel_provider.send_message({
              command: 'RESPONSE_HISTORY',
              history
            })
          }

          const history_for_checkpoint = [
            ...params.panel_provider.response_history
          ]
          const changes_accepted = await preview_handler({
            original_states: preview_data.original_states,
            chat_response: preview_data.chat_response,
            panel_provider: params.panel_provider,
            context: params.context,
            original_editor_state: args?.original_editor_state,
            raw_instructions: args?.raw_instructions,
            created_at: created_at_for_preview,
            url: args?.url
          })

          if (changes_accepted) {
            params.api_manager.cancel_all_requests()
            if (before_checkpoint) {
              const checkpoints =
                params.context.workspaceState.get<Checkpoint[]>(
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
                checkpoint_to_update.title = 'Response accepted'
                checkpoint_to_update.response_history = history_for_checkpoint
                checkpoint_to_update.response_preview_item_created_at =
                  created_at_for_preview

                checkpoints.sort((a, b) => b.timestamp - a.timestamp)

                await params.context.workspaceState.update(
                  CHECKPOINTS_STATE_KEY,
                  checkpoints
                )
                await params.panel_provider.send_checkpoints()
              }
            }

            before_checkpoint = undefined
          } else if (saved_tab_groups) {
            // Restore tab groups when preview gets rejected
            await restore_tab_groups(saved_tab_groups)
          }
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(
          dictionary.error_message.APPLYING_CHANGES_GENERIC_ERROR(err.message)
        )
      } finally {
        params.panel_provider.send_message({
          command: 'HIDE_PROGRESS'
        })
        in_progress = false
        if (before_checkpoint) {
          delete_checkpoint({
            context: params.context,
            panel_provider: params.panel_provider,
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
      current_editors.every((editor, index) => {
        const saved = saved_state.editors[index]
        return (
          editor.uri == saved.uri && editor.view_column == saved.view_column
        )
      })

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

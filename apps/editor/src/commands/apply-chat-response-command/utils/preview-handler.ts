import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '../types/original-file-state'
import { undo_files } from './file-operations'
import { preview } from './preview'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { update_undo_button_state } from './state-manager'
import { TasksUtils } from '@/utils/tasks-utils'
import { PromptsForCommitMessagesUtils } from '@/utils/prompts-for-commit-messages-utils'

export let ongoing_preview_cleanup_promise: Promise<void> | null = null

export const preview_handler = async (params: {
  original_states: OriginalFileState[]
  chat_response: string
  panel_provider: PanelProvider
  context: vscode.ExtensionContext
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  }
  raw_instructions?: string
  created_at?: number
  url?: string
}): Promise<boolean> => {
  let resolve_cleanup_promise: () => void
  ongoing_preview_cleanup_promise = new Promise((resolve) => {
    resolve_cleanup_promise = resolve
  })

  try {
    const preview_result = await preview({
      original_states: params.original_states,
      panel_provider: params.panel_provider,
      raw_instructions: params.raw_instructions,
      chat_response: params.chat_response,
      context: params.context,
      created_at: params.created_at,
      url: params.url
    })

    if (preview_result === null || preview_result.accepted_files.length == 0) {
      if (preview_result?.created_at) {
        const history = params.panel_provider.response_history
        const new_history = history.filter(
          (item) => item.created_at !== preview_result.created_at
        )

        params.panel_provider.response_history = new_history
        params.panel_provider.send_message({
          command: 'RESPONSE_HISTORY',
          history: new_history
        })
      }
      if (params.original_editor_state) {
        try {
          const uri = vscode.Uri.file(params.original_editor_state.file_path)
          const document = await vscode.workspace.openTextDocument(uri)
          const editor = await vscode.window.showTextDocument(document, {
            preview: false
          })
          const position = new vscode.Position(
            params.original_editor_state.position.line,
            params.original_editor_state.position.character
          )
          editor.selection = new vscode.Selection(position, position)
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          )
        } catch (error) {
          Logger.error({
            function_name: 'preview_handler',
            message: 'Error restoring original editor state',
            data: error
          })
        }
      }
      await undo_files({
        original_states: params.original_states
      })
      update_undo_button_state({
        context: params.context,
        panel_provider: params.panel_provider,
        states: null
      })
      return false
    }

    if (preview_result.rejected_states.length > 0) {
      await undo_files({
        original_states: preview_result.rejected_states
      })
    }

    const accepted_states = params.original_states.filter((state) =>
      preview_result.accepted_files.some(
        (accepted) =>
          accepted.file_path == state.file_path &&
          accepted.workspace_name == state.workspace_name
      )
    )

    if (accepted_states.length > 0) {
      if (preview_result.created_at) {
        params.panel_provider.response_history = []
        params.panel_provider.send_message({
          command: 'RESPONSE_HISTORY',
          history: []
        })
      }

      if (params.raw_instructions) {
        const updated_tasks = TasksUtils.mark_as_completed_if_matches_prompt({
          context: params.context,
          prompt_text: params.raw_instructions
        })
        if (updated_tasks) {
          params.panel_provider.send_message({
            command: 'TASKS',
            tasks: updated_tasks
          })
        }

        const workspace_map = new Map<string, string>()
        vscode.workspace.workspaceFolders?.forEach((folder) => {
          workspace_map.set(folder.name, folder.uri.fsPath)
        })
        const default_workspace =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

        const files_by_workspace = new Map<string, string[]>()
        for (const state of accepted_states) {
          let workspace_root = default_workspace
          if (state.workspace_name && workspace_map.has(state.workspace_name)) {
            workspace_root = workspace_map.get(state.workspace_name)!
          }
          if (workspace_root) {
            const current_files = files_by_workspace.get(workspace_root) || []
            if (!current_files.includes(state.file_path)) {
              current_files.push(state.file_path)
            }
            files_by_workspace.set(workspace_root, current_files)
          }
        }

        for (const [workspace_root, files] of files_by_workspace.entries()) {
          PromptsForCommitMessagesUtils.add({
            context: params.context,
            workspace_root,
            prompt: params.raw_instructions,
            files
          })
        }
      }

      update_undo_button_state({
        context: params.context,
        panel_provider: params.panel_provider,
        states: accepted_states,
        applied_content: params.chat_response,
        original_editor_state: params.original_editor_state
      })

      if (preview_result.active_editor_state) {
        try {
          const uri = vscode.Uri.file(
            preview_result.active_editor_state.file_path
          )
          const file_exists = await vscode.workspace.fs.stat(uri).then(
            () => true,
            () => false
          )

          if (file_exists) {
            const document = await vscode.workspace.openTextDocument(uri)
            const editor = await vscode.window.showTextDocument(document, {
              preview: false
            })
            const position = preview_result.active_editor_state.position
            editor.selection = new vscode.Selection(position, position)
            editor.revealRange(
              new vscode.Range(position, position),
              vscode.TextEditorRevealType.InCenter
            )
          }
        } catch (error) {
          Logger.error({
            function_name: 'preview_handler',
            message: 'Failed to restore active editor state',
            data: error
          })
        }
      }

      return true
    } else {
      update_undo_button_state({
        context: params.context,
        panel_provider: params.panel_provider,
        states: null
      })
      return false
    }
  } finally {
    resolve_cleanup_promise!()
    ongoing_preview_cleanup_promise = null
  }
}

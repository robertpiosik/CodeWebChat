import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '../types/original-file-state'
import { undo_files } from './file-operations'
import { preview } from './preview'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { update_undo_button_state } from './state-manager'

export let ongoing_review_cleanup_promise: Promise<void> | null = null

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
}): Promise<boolean> => {
  let resolve_cleanup_promise: () => void
  ongoing_review_cleanup_promise = new Promise((resolve) => {
    resolve_cleanup_promise = resolve
  })

  try {
    const preview_result = await preview({
      original_states: params.original_states,
      panel_provider: params.panel_provider,
      raw_instructions: params.raw_instructions,
      chat_response: params.chat_response,
      context: params.context,
      created_at: params.created_at
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
            function_name: 'handle_code_review_and_cleanup',
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
      update_undo_button_state({
        context: params.context,
        panel_provider: params.panel_provider,
        states: accepted_states,
        applied_content: params.chat_response,
        original_editor_state: params.original_editor_state
      })

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
    ongoing_review_cleanup_promise = null
  }
}

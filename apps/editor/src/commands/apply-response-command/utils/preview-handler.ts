import * as vscode from 'vscode'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '../types/original-file-state'
import { RecentApiConfiguration } from '@shared/types/response-history-item'
import { undo_files } from './file-operations'
import { preview } from './preview'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { update_undo_button_state } from './state-manager'
import { CommitMessageDetails } from '@/utils/commit-message-details'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { normalize_path } from '@/utils/normalize-path'

export let ongoing_preview_cleanup_promise: Promise<void> | null = null

export const preview_handler = async (params: {
  original_states: OriginalFileState[]
  chat_response: string
  prompt_view_provider: PromptViewProvider
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  }
  raw_instructions?: string
  created_at?: number
  url?: string
  recent_api_configuration?: RecentApiConfiguration
  is_code_at_cursor?: boolean
}): Promise<boolean> => {
  let resolve_cleanup_promise: () => void
  ongoing_preview_cleanup_promise = new Promise((resolve) => {
    resolve_cleanup_promise = resolve
  })

  try {
    const preview_result = await preview({
      original_states: params.original_states,
      prompt_view_provider: params.prompt_view_provider,
      raw_instructions: params.raw_instructions,
      chat_response: params.chat_response,
      extension_context: params.extension_context,
      created_at: params.created_at,
      url: params.url,
      recent_api_configuration: params.recent_api_configuration,
      workspace_provider: params.workspace_provider
    })

    if (preview_result === null || preview_result.accepted_files.length == 0) {
      if (preview_result?.created_at) {
        const history = params.prompt_view_provider.response_history
        const new_history = history.filter(
          (item) => item.created_at !== preview_result.created_at
        )

        params.prompt_view_provider.response_history = new_history
        params.prompt_view_provider.send_message({
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
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
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
        params.prompt_view_provider.response_history = []
        params.prompt_view_provider.send_message({
          command: 'RESPONSE_HISTORY',
          history: []
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

      const selected_files_by_workspace = new Map<string, string[]>()
      const checked_files = params.workspace_provider.get_checked_files()
      for (const file of checked_files) {
        const workspace_root =
          params.workspace_provider.get_workspace_root_for_file(file)
        if (workspace_root) {
          const relative_path = path.isAbsolute(file)
            ? normalize_path(path.relative(workspace_root, file))
            : normalize_path(file)
          const current_selected =
            selected_files_by_workspace.get(workspace_root) || []
          current_selected.push(relative_path)
          selected_files_by_workspace.set(workspace_root, current_selected)
        }
      }

      if (!params.is_code_at_cursor) {
        for (const [workspace_root, files] of files_by_workspace.entries()) {
          CommitMessageDetails.add({
            extension_context: params.extension_context,
            workspace_root,
            prompt: params.raw_instructions,
            files,
            selected_files:
              selected_files_by_workspace.get(workspace_root) || []
          })
        }
      }

      update_undo_button_state({
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
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
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
        states: null
      })
      return false
    }
  } finally {
    resolve_cleanup_promise!()
    ongoing_preview_cleanup_promise = null
  }
}

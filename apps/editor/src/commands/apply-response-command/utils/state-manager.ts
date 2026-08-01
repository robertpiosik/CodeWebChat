import * as vscode from 'vscode'
import {
  LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
} from '@/constants/state-keys'
import { OriginalFileState } from '../types/original-file-state'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const update_undo_button_state = (params: {
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  states: OriginalFileState[] | null
  applied_content?: string | null
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  } | null
}) => {
  if (params.states && params.states.length > 0) {
    params.extension_context.workspaceState.update(
      LAST_APPLIED_CHANGES_STATE_KEY,
      params.states
    )
    params.extension_context.workspaceState.update(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
      params.applied_content
    )
    params.extension_context.workspaceState.update(
      LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
      params.original_editor_state
    )
    params.prompt_view_provider.set_undo_button_state(true)
  } else {
    params.extension_context.workspaceState.update(
      LAST_APPLIED_CHANGES_STATE_KEY,
      null
    )
    params.extension_context.workspaceState.update(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
      null
    )
    params.extension_context.workspaceState.update(
      LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
      null
    )
    params.prompt_view_provider.set_undo_button_state(false)
  }
}

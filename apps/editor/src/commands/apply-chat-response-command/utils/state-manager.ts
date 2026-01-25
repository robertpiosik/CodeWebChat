import * as vscode from 'vscode'
import {
  LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
} from '@/constants/state-keys'
import { OriginalFileState } from '../types/original-file-state'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const update_undo_button_state = (params: {
  context: vscode.ExtensionContext
  panel_provider: PanelProvider
  states: OriginalFileState[] | null
  applied_content?: string | null
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  } | null
}) => {
  const {
    context,
    panel_provider,
    states,
    applied_content,
    original_editor_state
  } = params
  if (states && states.length > 0) {
    context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, states)
    context.workspaceState.update(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
      applied_content
    )
    context.workspaceState.update(
      LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
      original_editor_state
    )
    panel_provider.set_undo_button_state(true)
  } else {
    context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
    context.workspaceState.update(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
      null
    )
    context.workspaceState.update(
      LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
      null
    )
    panel_provider.set_undo_button_state(false)
  }
}

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
  if (params.states && params.states.length > 0) {
    params.context.workspaceState.update(
      LAST_APPLIED_CHANGES_STATE_KEY,
      params.states
    )
    params.context.workspaceState.update(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
      params.applied_content
    )
    params.context.workspaceState.update(
      LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
      params.original_editor_state
    )
    params.panel_provider.set_undo_button_state(true)
  } else {
    params.context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
    params.context.workspaceState.update(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
      null
    )
    params.context.workspaceState.update(
      LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
      null
    )
    params.panel_provider.set_undo_button_state(false)
  }
}

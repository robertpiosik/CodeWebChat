import { PanelViewProvider } from '../panel-view-provider'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '@/constants/state-keys'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'

export const handle_request_can_undo = (
  panel_view_provider: PanelViewProvider
) => {
  const original_states =
    panel_view_provider.extension_context.workspaceState.get<
      OriginalFileState[]
    >(LAST_APPLIED_CHANGES_STATE_KEY)
  const can_undo = !!original_states && original_states.length > 0

  panel_view_provider.send_message({
    command: 'CAN_UNDO_CHANGED',
    can_undo
  })
}

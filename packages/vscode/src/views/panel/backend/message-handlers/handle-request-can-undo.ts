import { PanelProvider } from '../panel-provider'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '@/constants/state-keys'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'

export const handle_request_can_undo = (panel_provider: PanelProvider) => {
  const original_states = panel_provider.context.workspaceState.get<
    OriginalFileState[]
  >(LAST_APPLIED_CHANGES_STATE_KEY)
  const can_undo = !!original_states && original_states.length > 0

  panel_provider.send_message({
    command: 'CAN_UNDO_CHANGED',
    can_undo
  })
}

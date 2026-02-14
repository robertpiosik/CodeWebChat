import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  SaveInstructionsMessage,
  InstructionsState
} from '@/views/panel/types/messages'
import {
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_CODE_AT_CURSOR_STATE_KEY,
  INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
  INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
  INSTRUCTIONS_PRUNE_CONTEXT_STATE_KEY
} from '@/constants/state-keys'

export const handle_save_instructions = async (
  panel_provider: PanelProvider,
  message: SaveInstructionsMessage
): Promise<void> => {
  const { prompt_type, instruction } = message as any
  const instruction_state = instruction as InstructionsState

  if (prompt_type == 'ask-about-context') {
    panel_provider.ask_about_context_instructions = instruction_state
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_ASK_STATE_KEY,
      instruction_state
    )
  } else if (prompt_type == 'edit-context') {
    panel_provider.edit_context_instructions = instruction_state
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
      instruction_state
    )
  } else if (prompt_type == 'no-context') {
    panel_provider.no_context_instructions = instruction_state
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
      instruction_state
    )
  } else if (prompt_type == 'code-at-cursor') {
    panel_provider.code_at_cursor_instructions = instruction_state
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_CODE_AT_CURSOR_STATE_KEY,
      instruction_state
    )
  } else if (prompt_type == 'prune-context') {
    panel_provider.prune_context_instructions = instruction_state
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_PRUNE_CONTEXT_STATE_KEY,
      instruction_state
    )
  } else {
    return
  }
}

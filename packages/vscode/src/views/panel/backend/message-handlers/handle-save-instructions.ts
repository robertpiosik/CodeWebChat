import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveInstructionsMessage } from '@/views/panel/types/messages'
import {
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY,
  INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
  INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
  INSTRUCTIONS_PRUNE_CONTEXT_STATE_KEY
} from '@/constants/state-keys'

export const handle_save_instructions = async (
  panel_provider: PanelProvider,
  message: SaveInstructionsMessage
): Promise<void> => {
  const { mode, instruction } = message

  if (mode == 'ask-about-context') {
    panel_provider.ask_about_context_instructions = instruction
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_ASK_STATE_KEY,
      instruction
    )
  } else if (mode == 'edit-context') {
    panel_provider.edit_context_instructions = instruction
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
      instruction
    )
  } else if (mode == 'no-context') {
    panel_provider.no_context_instructions = instruction
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
      instruction
    )
  } else if (mode == 'code-at-cursor') {
    panel_provider.code_at_cursor_instructions = instruction
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY,
      instruction
    )
  } else if (mode == 'prune-context') {
    panel_provider.prune_context_instructions = instruction
    await panel_provider.context.workspaceState.update(
      INSTRUCTIONS_PRUNE_CONTEXT_STATE_KEY,
      instruction
    )
  } else {
    return
  }
}

import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveInstructionsMessage } from '@/views/panel/types/messages'
import {
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY,
  INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
  INSTRUCTIONS_NO_CONTEXT_STATE_KEY
} from '@/constants/state-keys'

export const handle_save_instructions = async (
  provider: PanelProvider,
  message: SaveInstructionsMessage
): Promise<void> => {
  const { mode, instruction } = message

  if (mode == 'ask') {
    provider.ask_instructions = instruction
    await provider.context.workspaceState.update(
      INSTRUCTIONS_ASK_STATE_KEY,
      instruction
    )
  } else if (mode == 'edit-context') {
    provider.edit_instructions = instruction
    await provider.context.workspaceState.update(
      INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY,
      instruction
    )
  } else if (mode == 'no-context') {
    provider.no_context_instructions = instruction
    await provider.context.workspaceState.update(
      INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
      instruction
    )
  } else if (mode == 'code-completions') {
    provider.code_completion_instructions = instruction
    await provider.context.workspaceState.update(
      INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY,
      instruction
    )
  } else {
    return
  }
}

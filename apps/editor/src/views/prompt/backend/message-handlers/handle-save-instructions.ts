import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import {
  SaveInstructionsMessage,
  InstructionsState
} from '@/views/prompt/types/messages'
import {
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_EDIT_FILES_STATE_KEY,
  INSTRUCTIONS_NO_CONTEXT_STATE_KEY
} from '@/constants/state-keys'

export const handle_save_instructions = async (
  prompt_view_provider: PromptViewProvider,
  message: SaveInstructionsMessage
): Promise<void> => {
  const { prompt_type, instruction } = message as any
  const instruction_state = instruction as InstructionsState

  if (prompt_type == 'ask-about-files') {
    prompt_view_provider.ask_about_context_instructions = instruction_state
    await prompt_view_provider.extension_context.workspaceState.update(
      INSTRUCTIONS_ASK_STATE_KEY,
      instruction_state
    )
  } else if (prompt_type == 'edit-files') {
    prompt_view_provider.edit_files_instructions = instruction_state
    await prompt_view_provider.extension_context.workspaceState.update(
      INSTRUCTIONS_EDIT_FILES_STATE_KEY,
      instruction_state
    )
  } else if (prompt_type == 'without-files') {
    prompt_view_provider.no_context_instructions = instruction_state
    await prompt_view_provider.extension_context.workspaceState.update(
      INSTRUCTIONS_NO_CONTEXT_STATE_KEY,
      instruction_state
    )
  } else {
    return
  }
}

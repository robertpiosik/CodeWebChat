import { ViewProvider } from '@/views/panel/backend/view-provider'
import { SaveInstructionsMessage } from '@/views/panel/types/messages'

export const handle_save_instructions = async (
  provider: ViewProvider,
  message: SaveInstructionsMessage
): Promise<void> => {
  const { mode, instruction } = message

  if (mode == 'ask') {
    provider.ask_instructions = instruction
  } else if (mode == 'edit-context') {
    provider.edit_instructions = instruction
  } else if (mode == 'no-context') {
    provider.no_context_instructions = instruction
  } else if (mode == 'code-completions') {
    provider.code_completion_instructions = instruction
  } else {
    return
  }
}

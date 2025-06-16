import { MainViewProvider } from '@/views/main/backend/view-provider'
import { SaveCodeCompletionSuggestionsMessage } from '@/views/main/types/messages'

export const handle_save_code_completion_suggestions = async (
  provider: MainViewProvider,
  message: SaveCodeCompletionSuggestionsMessage
): Promise<void> => {
  provider.code_completion_suggestions = message.instruction
  await provider.context.workspaceState.update(
    'code-completion-suggestions',
    message.instruction
  )
}

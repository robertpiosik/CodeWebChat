import { MainViewProvider } from '@/views/main/backend/view-provider'
import { SaveCodeCompletionsModeMessage } from '@/views/main/types/messages'

export const handle_save_code_completions_mode = async (
  provider: MainViewProvider,
  message: SaveCodeCompletionsModeMessage
): Promise<void> => {
  provider.is_code_completions_mode = message.enabled
  provider.calculate_token_count()
  provider.send_message({
    command: 'CODE_COMPLETIONS_MODE',
    enabled: message.enabled
  })
}

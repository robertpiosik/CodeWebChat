import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_code_completion_suggestions = (
  provider: MainViewProvider
): void => {
  provider.send_message<ExtensionMessage>({
    command: 'CODE_COMPLETION_SUGGESTIONS',
    value: provider.code_completion_suggestions
  })
}

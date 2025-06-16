import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_code_completions_mode = (
  provider: MainViewProvider
): void => {
  provider.send_message<ExtensionMessage>({
    command: 'CODE_COMPLETIONS_MODE',
    enabled: provider.is_code_completions_mode
  })
}

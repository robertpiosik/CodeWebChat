import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_code_completions_mode = (
  provider: ViewProvider
): void => {
  provider.send_message<ExtensionMessage>({
    command: 'CODE_COMPLETIONS_MODE',
    enabled: provider.is_code_completions_mode
  })
}

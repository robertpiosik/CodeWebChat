import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_code_completions_history = (
  provider: MainViewProvider
): void => {
  const history = provider.context.workspaceState.get<string[]>(
    'code-completions-history',
    []
  )
  provider.send_message<ExtensionMessage>({
    command: 'FIM_CHAT_HISTORY',
    messages: history
  })
}

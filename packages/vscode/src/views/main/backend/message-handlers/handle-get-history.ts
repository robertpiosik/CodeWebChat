import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_history = (provider: MainViewProvider): void => {
  const history = provider.context.workspaceState.get<string[]>('history', [])
  provider.send_message<ExtensionMessage>({
    command: 'CHAT_HISTORY',
    messages: history
  })
}
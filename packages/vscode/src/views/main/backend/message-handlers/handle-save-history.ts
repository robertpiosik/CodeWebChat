import { MainViewProvider } from '@/views/main/backend/view-provider'
import { SaveHistoryMessage } from '@/views/main/types/messages'

export const handle_save_history = async (
  provider: MainViewProvider,
  message: SaveHistoryMessage
): Promise<void> => {
  const key = !provider.is_code_completions_mode
    ? 'history'
    : 'code-completions-history'
  await provider.context.workspaceState.update(key, message.messages)
}

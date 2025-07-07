import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY
} from '@/constants/state-keys'
import { ViewProvider } from '@/view/backend/view-provider'
import { SaveHistoryMessage } from '@/view/types/messages'

export const handle_save_history = async (
  provider: ViewProvider,
  message: SaveHistoryMessage
): Promise<void> => {
  let key: string | undefined
  switch (message.mode) {
    case 'ask':
      key = HISTORY_ASK_STATE_KEY
      break
    case 'edit':
      key = HISTORY_EDIT_STATE_KEY
      break
    case 'no-context':
      key = HISTORY_NO_CONTEXT_STATE_KEY
      break
    case 'code-completions':
      key = HISTORY_CODE_COMPLETIONS_STATE_KEY
      break
  }
  if (key) {
    await provider.context.workspaceState.update(key, message.messages)
  }
}

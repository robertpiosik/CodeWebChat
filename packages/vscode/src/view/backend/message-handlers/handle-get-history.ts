import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY
} from '@/constants/state-keys'
import { ViewProvider } from '@/view/backend/view-provider'

export const handle_get_history = (provider: ViewProvider): void => {
  const ask_history = provider.context.workspaceState.get<string[]>(
    HISTORY_ASK_STATE_KEY,
    []
  )
  const edit_history = provider.context.workspaceState.get<string[]>(
    HISTORY_EDIT_STATE_KEY,
    []
  )
  const code_completions_history = provider.context.workspaceState.get<
    string[]
  >(HISTORY_CODE_COMPLETIONS_STATE_KEY, [])
  const no_context_history = provider.context.workspaceState.get<string[]>(
    HISTORY_NO_CONTEXT_STATE_KEY,
    []
  )

  provider.send_message({
    command: 'CHAT_HISTORY',
    ask: ask_history,
    edit_context: edit_history,
    no_context: no_context_history,
    code_completions: code_completions_history
  })
}

import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY,
  HistoryEntry
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_history = (panel_provider: PanelProvider): void => {
  const ask_history = panel_provider.context.workspaceState.get<HistoryEntry[]>(
    HISTORY_ASK_STATE_KEY,
    []
  )
  const edit_history = panel_provider.context.workspaceState.get<
    HistoryEntry[]
  >(HISTORY_EDIT_STATE_KEY, [])
  const code_completions_history = panel_provider.context.workspaceState.get<
    HistoryEntry[]
  >(HISTORY_CODE_COMPLETIONS_STATE_KEY, [])
  const no_context_history = panel_provider.context.workspaceState.get<
    HistoryEntry[]
  >(HISTORY_NO_CONTEXT_STATE_KEY, [])

  panel_provider.send_message({
    command: 'CHAT_HISTORY',
    ask: ask_history.map((h) => h.text),
    edit_context: edit_history.map((h) => h.text),
    no_context: no_context_history.map((h) => h.text),
    code_completions: code_completions_history.map((h) => h.text)
  })
}

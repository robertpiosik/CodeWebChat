import {
  HISTORY_ASK_ABOUT_FILES_STATE_KEY,
  HISTORY_CODE_AT_CURSOR_STATE_KEY,
  HISTORY_EDIT_FILES_STATE_KEY,
  HISTORY_WITHOUT_FILES_STATE_KEY,
  HistoryEntry
} from '@/constants/state-keys'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_history = (
  prompt_view_provider: PromptViewProvider
) => {
  const edit_files_history =
    prompt_view_provider.extension_context.workspaceState.get<HistoryEntry[]>(
      HISTORY_EDIT_FILES_STATE_KEY,
      []
    )
  const ask_about_files_history =
    prompt_view_provider.extension_context.workspaceState.get<HistoryEntry[]>(
      HISTORY_ASK_ABOUT_FILES_STATE_KEY,
      []
    )
  const code_at_cursor_history =
    prompt_view_provider.extension_context.workspaceState.get<HistoryEntry[]>(
      HISTORY_CODE_AT_CURSOR_STATE_KEY,
      []
    )
  const without_files_history =
    prompt_view_provider.extension_context.workspaceState.get<HistoryEntry[]>(
      HISTORY_WITHOUT_FILES_STATE_KEY,
      []
    )

  prompt_view_provider.send_message({
    command: 'CHAT_HISTORY',
    ask_about_files: ask_about_files_history.map((h) => h.text),
    edit_files: edit_files_history.map((h) => h.text),
    without_files: without_files_history.map((h) => h.text),
    code_at_cursor: code_at_cursor_history.map((h) => h.text)
  })
}

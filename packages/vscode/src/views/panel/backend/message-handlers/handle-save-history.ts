import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY,
  HistoryEntry,
  PINNED_HISTORY_ASK_STATE_KEY,
  PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY,
  PINNED_HISTORY_EDIT_STATE_KEY,
  PINNED_HISTORY_NO_CONTEXT_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveHistoryMessage } from '@/views/panel/types/messages'

export const handle_save_history = async (
  provider: PanelProvider,
  message: SaveHistoryMessage
): Promise<void> => {
  let key: string | undefined
  let pinned_key: string | undefined
  switch (message.mode) {
    case 'ask':
      key = HISTORY_ASK_STATE_KEY
      pinned_key = PINNED_HISTORY_ASK_STATE_KEY
      break
    case 'edit-context':
      key = HISTORY_EDIT_STATE_KEY
      pinned_key = PINNED_HISTORY_EDIT_STATE_KEY
      break
    case 'no-context':
      key = HISTORY_NO_CONTEXT_STATE_KEY
      pinned_key = PINNED_HISTORY_NO_CONTEXT_STATE_KEY
      break
    case 'code-completions':
      key = HISTORY_CODE_COMPLETIONS_STATE_KEY
      pinned_key = PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY
      break
  }
  if (key) {
    const text_history: string[] = message.messages
    if (text_history.length === 0) {
      await provider.context.workspaceState.update(key, [])
      return
    }

    const old_history =
      provider.context.workspaceState.get<HistoryEntry[]>(key, []) || []
    const old_history_map = new Map(
      old_history.map((entry) => [entry.text, entry])
    )

    const new_history: HistoryEntry[] = []

    // Using a Set to ensure no duplicates are added, though frontend should handle this.
    const processedTexts = new Set<string>()

    for (const text of text_history) {
      if (processedTexts.has(text)) continue
      processedTexts.add(text)

      // The first item in text_history is the one that was just used.
      // Its timestamp is updated to reflect recent use.
      if (text === text_history[0]) {
        new_history.push({ text, createdAt: Date.now() })
      } else {
        const old_entry = old_history_map.get(text)
        if (old_entry) {
          new_history.push(old_entry)
        } else {
          // Fallback for entries not in old history
          new_history.push({ text, createdAt: Date.now() })
        }
      }
    }

    await provider.context.workspaceState.update(key, new_history)

    if (pinned_key) {
      const used_text = text_history[0]
      const pinned_history =
        provider.context.workspaceState.get<HistoryEntry[]>(pinned_key, []) ||
        []
      const pinned_index = pinned_history.findIndex((p) => p.text === used_text)

      if (pinned_index > -1) {
        pinned_history[pinned_index].createdAt = Date.now()
        await provider.context.workspaceState.update(pinned_key, pinned_history)
      }
    }
  }
}

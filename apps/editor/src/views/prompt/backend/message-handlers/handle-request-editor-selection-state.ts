import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_request_editor_selection_state = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'EDITOR_SELECTION_CHANGED',
    current_selection: prompt_view_provider.current_selection || null
  })
}

import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_request_editor_state = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'EDITOR_STATE_CHANGED',
    currently_open_file_path: prompt_view_provider.currently_open_file_path
  })
}

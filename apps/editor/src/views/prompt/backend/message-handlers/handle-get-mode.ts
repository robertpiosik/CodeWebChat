import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_mode = (prompt_view_provider: PromptViewProvider) => {
  prompt_view_provider.send_message({
    command: 'MODE',
    mode: prompt_view_provider.mode
  })
}

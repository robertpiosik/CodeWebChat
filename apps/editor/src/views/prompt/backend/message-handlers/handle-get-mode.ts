import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_target = (prompt_view_provider: PromptViewProvider) => {
  prompt_view_provider.send_message({
    command: 'TARGET',
    target: prompt_view_provider.target
  })
}

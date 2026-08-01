import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_web_prompt_type = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'WEB_PROMPT_TYPE',
    prompt_type: prompt_view_provider.web_prompt_type
  })
}

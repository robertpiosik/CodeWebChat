import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_cli_prompt_type = (
  prompt_view_provider: PromptViewProvider
): void => {
  prompt_view_provider.send_message({
    command: 'CLI_PROMPT_TYPE',
    prompt_type: prompt_view_provider.cli_prompt_type
  })
}

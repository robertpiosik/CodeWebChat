import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_instructions = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'INSTRUCTIONS',
    ask_about_context: prompt_view_provider.ask_about_context_instructions,
    edit_files: prompt_view_provider.edit_files_instructions,
    no_context: prompt_view_provider.no_context_instructions
  })
}

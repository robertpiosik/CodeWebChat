import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_edit_format = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: prompt_view_provider.edit_format
  })
}

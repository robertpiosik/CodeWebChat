import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { ModeChangedMessage } from '@/views/prompt/types/messages'

export const handle_mode_changed = (
  prompt_view_provider: PromptViewProvider,
  message: ModeChangedMessage
): void => {
  prompt_view_provider.mode = message.mode
  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: prompt_view_provider.edit_format
  })
}

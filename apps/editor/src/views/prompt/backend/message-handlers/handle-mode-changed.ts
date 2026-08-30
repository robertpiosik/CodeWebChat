import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { TargetChangedMessage } from '@/views/prompt/types/messages'

export const handle_target_changed = (
  prompt_view_provider: PromptViewProvider,
  message: TargetChangedMessage
): void => {
  prompt_view_provider.target = message.target
  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: prompt_view_provider.edit_format
  })
}

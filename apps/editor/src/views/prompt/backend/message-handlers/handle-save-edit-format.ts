import { EDIT_FORMAT_STATE_KEY } from '@/constants/state-keys'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { SaveEditFormatMessage } from '@/views/prompt/types/messages'

export const handle_save_edit_format = async (
  prompt_view_provider: PromptViewProvider,
  message: SaveEditFormatMessage
): Promise<void> => {
  prompt_view_provider.edit_format = message.edit_format
  await prompt_view_provider.extension_context.workspaceState.update(
    EDIT_FORMAT_STATE_KEY,
    message.edit_format
  )
  await prompt_view_provider.extension_context.globalState.update(
    EDIT_FORMAT_STATE_KEY,
    message.edit_format
  )

  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: prompt_view_provider.edit_format
  })
}

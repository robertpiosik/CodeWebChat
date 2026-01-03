import { toggle_file_preview_state } from '@/commands/apply-chat-response-command/utils/preview/preview'
import { ToggleFileInPreviewMessage } from '../../types/messages'

export const handle_toggle_file_in_preview = async (
  message: ToggleFileInPreviewMessage
) => {
  if (toggle_file_preview_state) {
    await toggle_file_preview_state({
      file_path: message.file_path,
      workspace_name: message.workspace_name,
      is_checked: message.is_checked
    })
  }
}

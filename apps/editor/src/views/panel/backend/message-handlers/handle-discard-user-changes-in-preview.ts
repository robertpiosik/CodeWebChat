import { discard_user_changes_in_preview } from '@/commands/apply-chat-response-command/utils/preview/preview'
import { DiscardUserChangesInPreviewMessage } from '../../types/messages'

export const handle_discard_user_changes_in_preview = async (
  message: DiscardUserChangesInPreviewMessage
) => {
  if (discard_user_changes_in_preview) {
    await discard_user_changes_in_preview({
      file_path: message.file_path,
      workspace_name: message.workspace_name
    })
  }
}

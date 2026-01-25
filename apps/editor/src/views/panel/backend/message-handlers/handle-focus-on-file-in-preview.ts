import { response_preview_promise_resolve } from '@/commands/apply-chat-response-command/utils/preview'
import { FocusOnFileInPreviewMessage } from '@/views/panel/types/messages'

export const handle_focus_on_file_in_preview = (
  message: FocusOnFileInPreviewMessage
): void => {
  if (response_preview_promise_resolve) {
    response_preview_promise_resolve({
      jump_to: {
        file_path: message.file_path,
        workspace_name: message.workspace_name
      }
    })
  }
}

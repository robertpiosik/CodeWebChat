import { response_preview_promise_resolve } from '@/commands/apply-chat-response-command/utils/preview'
import { ResponsePreviewMessage } from '@/views/panel/types/messages'

export const handle_response_preview = async (
  message: ResponsePreviewMessage
): Promise<void> => {
  if (response_preview_promise_resolve) {
    response_preview_promise_resolve({
      accepted_files: message.files,
      created_at: message.created_at
    })
  }
}
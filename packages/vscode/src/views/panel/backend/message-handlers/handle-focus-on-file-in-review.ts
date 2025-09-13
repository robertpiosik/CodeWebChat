import { code_review_promise_resolve } from '@/commands/apply-chat-response-command/utils/review'
import { ViewProvider } from '@/views/panel/backend/view-provider'
import { FocusOnFileInReviewMessage } from '@/views/panel/types/messages'

export const handle_focus_on_file_in_review = (
  _provider: ViewProvider,
  message: FocusOnFileInReviewMessage
): void => {
  if (code_review_promise_resolve) {
    code_review_promise_resolve({
      jump_to: {
        file_path: message.file_path,
        workspace_name: message.workspace_name
      }
    })
  }
}

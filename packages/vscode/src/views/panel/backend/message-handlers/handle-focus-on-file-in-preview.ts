import { code_review_promise_resolve } from '@/commands/apply-chat-response-command/utils/preview'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { FocusOnFileInPreviewMessage } from '@/views/panel/types/messages'

export const handle_focus_on_file_in_preview = (
  _provider: PanelProvider,
  message: FocusOnFileInPreviewMessage
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

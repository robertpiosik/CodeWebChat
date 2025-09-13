import * as vscode from 'vscode'
import { toggle_file_review_state } from '@/commands/apply-chat-response-command/utils/review'
import { ViewProvider } from '@/views/panel/backend/view-provider'
import { ToggleFileInReviewMessage } from '@/views/panel/types/messages'

export const handle_toggle_file_in_review = async (
  _provider: ViewProvider,
  message: ToggleFileInReviewMessage
): Promise<void> => {
  if (toggle_file_review_state) {
    await vscode.workspace.saveAll()
    await toggle_file_review_state({
      file_path: message.file_path,
      workspace_name: message.workspace_name,
      is_checked: message.is_checked
    })
  }
}

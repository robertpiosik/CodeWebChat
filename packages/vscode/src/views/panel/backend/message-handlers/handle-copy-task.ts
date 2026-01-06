import * as vscode from 'vscode'
import { CopyTaskMessage } from '@/views/panel/types/messages'
import { dictionary } from '@shared/constants/dictionary'

export const handle_copy_task = async (
  message: CopyTaskMessage
): Promise<void> => {
  await vscode.env.clipboard.writeText(message.text)
  vscode.window.showInformationMessage(
    dictionary.information_message.TASK_COPIED_TO_CLIPBOARD
  )
}

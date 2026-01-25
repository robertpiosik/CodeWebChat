import * as vscode from 'vscode'
import { UpdateCheckNewFilesMessage } from '@/views/settings/types/messages'

export const handle_update_check_new_files = async (
  message: UpdateCheckNewFilesMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update('checkNewFiles', message.enabled, vscode.ConfigurationTarget.Global)
}

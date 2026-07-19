import * as vscode from 'vscode'
import { UpdateCopyPathsFormatMessage } from '@/views/settings/types/messages'

export const handle_update_copy_paths_format = async (
  message: UpdateCopyPathsFormatMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update('copyPathsFormat', message.value, vscode.ConfigurationTarget.Global)
}

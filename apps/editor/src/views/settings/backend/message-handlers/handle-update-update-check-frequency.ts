import * as vscode from 'vscode'
import { UpdateUpdateCheckFrequencyMessage } from '../../types/messages'

export const handle_update_update_check_frequency = async (
  message: UpdateUpdateCheckFrequencyMessage
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'updateCheckFrequency',
    message.value,
    vscode.ConfigurationTarget.Global
  )
}

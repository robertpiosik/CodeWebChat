import * as vscode from 'vscode'
import { UpdateMinimumReleaseAgeMessage } from '../../types/messages'

export const handle_update_minimum_release_age = async (
  message: UpdateMinimumReleaseAgeMessage
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'minimumReleaseAge',
    message.value,
    vscode.ConfigurationTarget.Global
  )
}

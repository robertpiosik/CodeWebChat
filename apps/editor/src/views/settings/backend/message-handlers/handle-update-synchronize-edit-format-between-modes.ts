import * as vscode from 'vscode'
import { UpdateSynchronizeEditFormatBetweenModesMessage } from '../../types/messages'

export const handle_update_synchronize_edit_format_between_modes = async (
  message: UpdateSynchronizeEditFormatBetweenModesMessage
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'synchronizeEditFormatBetweenModes',
    message.enabled,
    vscode.ConfigurationTarget.Workspace
  )
}

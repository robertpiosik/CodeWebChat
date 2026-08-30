import * as vscode from 'vscode'
import { UpdateSynchronizeEditFormatBetweenTargetsMessage } from '../../types/messages'

export const handle_update_synchronize_edit_format_between_targets = async (
  message: UpdateSynchronizeEditFormatBetweenTargetsMessage
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'synchronizeEditFormatBetweenTargets',
    message.enabled,
    vscode.ConfigurationTarget.Workspace
  )
}

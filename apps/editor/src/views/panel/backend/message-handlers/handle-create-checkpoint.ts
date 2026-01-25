import * as vscode from 'vscode'
import { create_checkpoint } from '@/commands/checkpoints-command/actions'
import type { PanelProvider } from '../panel-provider'
import { dictionary } from '@shared/constants/dictionary'

export const handle_create_checkpoint = async (
  panel_provider: PanelProvider
) => {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    vscode.window.showErrorMessage(
      dictionary.error_message.CHECKPOINTS_ONLY_IN_WORKSPACE
    )
    return
  }
  await create_checkpoint(
    panel_provider.workspace_provider,
    panel_provider.context,
    panel_provider,
    panel_provider.websites_provider
  )
}

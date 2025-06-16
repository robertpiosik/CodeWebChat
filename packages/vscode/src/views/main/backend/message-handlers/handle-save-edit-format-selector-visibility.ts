import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { SaveEditFormatSelectorVisibilityMessage } from '@/views/main/types/messages'

export const handle_save_edit_format_selector_visibility = async (
  provider: MainViewProvider,
  message: SaveEditFormatSelectorVisibilityMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'editFormatSelectorVisibility',
    message.visibility,
    vscode.ConfigurationTarget.Global
  )
}

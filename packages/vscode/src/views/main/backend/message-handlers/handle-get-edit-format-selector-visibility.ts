import { MainViewProvider } from '@/views/main/backend/view-provider'
import * as vscode from 'vscode'
import { ExtensionMessage } from '@/views/main/types/messages'
import { EditFormatSelectorVisibility } from '@/views/main/types/edit-format-selector-visibility'

export const handle_get_edit_format_selector_visibility = (
  provider: MainViewProvider
): void => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const visibility = config.get<EditFormatSelectorVisibility>(
    'editFormatSelectorVisibility'
  )!
  provider.send_message<ExtensionMessage>({
    command: 'EDIT_FORMAT_SELECTOR_VISIBILITY',
    visibility
  })
}

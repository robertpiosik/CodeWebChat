import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_send_with_shift_enter = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('sendWithShiftEnter', false)
  provider.postMessage({
    command: 'SEND_WITH_SHIFT_ENTER',
    enabled
  })
}

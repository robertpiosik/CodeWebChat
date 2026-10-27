import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_forwarded_ports = async (
  settings_provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const forwarded_ports = config.get<number[]>('forwardedPorts', []) || []
  settings_provider.postMessage({
    command: 'FORWARDED_PORTS',
    forwarded_ports
  })
}
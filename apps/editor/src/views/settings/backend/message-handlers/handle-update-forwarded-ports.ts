import * as vscode from 'vscode'
import { UpdateForwardedPortsMessage } from '@/views/settings/types/messages'

export const handle_update_forwarded_ports = async (
  message: UpdateForwardedPortsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'forwardedPorts',
    message.forwarded_ports,
    vscode.ConfigurationTarget.Global
  )
}
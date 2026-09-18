import * as vscode from 'vscode'
import { env } from 'vscode'

export const open_url_command = (params: { command: string; url: string }) => {
  return vscode.commands.registerCommand(params.command, () => {
    env.openExternal(vscode.Uri.parse(params.url))
  })
}

import * as vscode from 'vscode'

export const open_settings = {
  general: {
    prompt: () =>
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:general:group:prompt'
      )
  },
  web: {
    chatbots: () => {
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:web:group:chatbots'
      )
    }
  },
  api: {
    models: () => {
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:api:group:models'
      )
    }
  }
}

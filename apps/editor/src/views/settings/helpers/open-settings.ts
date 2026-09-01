import * as vscode from 'vscode'

export const open_settings = {
  general: {
    prompt_field: () =>
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:general:group:prompt-field'
      )
  },
  web: {
    web_configurations: () => {
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:web:group:web-configurations'
      )
    }
  },
  api: {
    api_configurations: () => {
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:api:group:api-configurations'
      )
    }
  }
}

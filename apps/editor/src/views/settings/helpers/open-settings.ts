import * as vscode from 'vscode'

export const open_settings = {
  general: {
    prompt_field: () =>
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:general:group:prompt-field'
      )
  },
  chatbots: {
    web_configurations: () => {
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:chatbots:group:web-configurations'
      )
    }
  },
  api_calls: {
    api_configurations: () => {
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:api-calls:group:api-configurations'
      )
    }
  }
}

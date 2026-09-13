import * as vscode from 'vscode'

export const toggle_pinned = async (params: {
  web_configuration_name: string
}): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_configs = config.get<any[]>('chatbots', []) || []

  const updated_configs = current_configs.map((c) => {
    if (c.name == params.web_configuration_name) {
      return { ...c, isPinned: !c.isPinned }
    }
    return c
  })

  await config.update(
    'chatbots',
    updated_configs,
    vscode.ConfigurationTarget.Global
  )
}

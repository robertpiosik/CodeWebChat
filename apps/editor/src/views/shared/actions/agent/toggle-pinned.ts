import * as vscode from 'vscode'

export const toggle_pinned = async (params: {
  agent_configuration_name: string
}): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_configs = config.get<any[]>('agents', []) || []

  const updated_configs = current_configs.map((c) => {
    if (c.name == params.agent_configuration_name) {
      return { ...c, isPinned: !c.isPinned }
    }
    return c
  })

  await config.update(
    'agents',
    updated_configs,
    vscode.ConfigurationTarget.Global
  )
}
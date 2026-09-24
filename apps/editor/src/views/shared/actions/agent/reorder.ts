import * as vscode from 'vscode'
import { AgentConfiguration } from '@shared/types/agent-configuration'
import { ui_agent_configuration_to_config_format } from '@/utils/agent-configuration-format-converters'

export const reorder = async (params: {
  reordered_agent_configurations: AgentConfiguration[]
}): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_formatted_agent_configurations =
    params.reordered_agent_configurations.map((agent_configuration) =>
      ui_agent_configuration_to_config_format(agent_configuration)
    )
  await config.update(
    'agents',
    config_formatted_agent_configurations,
    vscode.ConfigurationTarget.Global
  )
}
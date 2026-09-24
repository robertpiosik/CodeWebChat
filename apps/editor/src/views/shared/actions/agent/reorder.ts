import * as vscode from 'vscode'
import { CliConfiguration } from '@/types/cli-configuration'
import { ui_agent_configuration_to_config_format } from '@/utils/cli-configuration-format-converters'

export const reorder = async (params: {
  reordered_agent_configurations: CliConfiguration[]
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
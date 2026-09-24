import * as vscode from 'vscode'
import { CliConfiguration } from '@/types/cli-configuration'
import { ui_cli_configuration_to_config_format } from '@/utils/cli-configuration-format-converters'

export const reorder = async (params: {
  reordered_cli_configurations: CliConfiguration[]
}): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_formatted_cli_configurations =
    params.reordered_cli_configurations.map((cli_configuration) =>
      ui_cli_configuration_to_config_format(cli_configuration)
    )
  await config.update(
    'agents',
    config_formatted_cli_configurations,
    vscode.ConfigurationTarget.Global
  )
}
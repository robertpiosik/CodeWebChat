import * as vscode from 'vscode'
import { WebConfiguration } from '@shared/types/web-configuration'
import { ui_web_configuration_to_config_format } from '@/utils/web-configuration-format-converters'

export const reorder = async (params: {
  reordered_web_configurations: WebConfiguration[]
}): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_formatted_web_configurations =
    params.reordered_web_configurations.map((web_configuration) =>
      ui_web_configuration_to_config_format(web_configuration)
    )
  await config.update(
    'webConfigurations',
    config_formatted_web_configurations,
    vscode.ConfigurationTarget.Global
  )
}

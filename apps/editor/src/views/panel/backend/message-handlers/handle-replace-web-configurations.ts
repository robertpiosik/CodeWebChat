import * as vscode from 'vscode'
import { ReplaceWebConfigurationsMessage } from '@/views/panel/types/messages'
import { ui_web_configuration_to_config_format } from '@/views/utils/web-configuration-format-converters'

export const handle_replace_web_configurations = async (
  message: ReplaceWebConfigurationsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_formatted_web_configurations = message.web_configurations.map((web_configuration) =>
    ui_web_configuration_to_config_format(web_configuration)
  )
  await config.update(
    'webConfigurations',
    config_formatted_web_configurations,
    vscode.ConfigurationTarget.Global
  )
}

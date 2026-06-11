import * as vscode from 'vscode'
import { ReplaceWebConfigurationsMessage } from '@/views/panel/types/messages'
import { ui_web_configuration_to_config_format } from '@/views/panel/backend/utils/web-configuration-format-converters'
import { PanelProvider } from '../panel-provider'

export const handle_replace_web_configurations = async (
  panel_provider: PanelProvider,
  message: ReplaceWebConfigurationsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const web_configurations_config_key = panel_provider.get_web_configurations_config_key()
  const config_formatted_web_configurations = message.web_configurations.map((web_configuration) =>
    ui_web_configuration_to_config_format(web_configuration)
  )
  await config.update(
    web_configurations_config_key,
    config_formatted_web_configurations,
    vscode.ConfigurationTarget.Global
  )
}

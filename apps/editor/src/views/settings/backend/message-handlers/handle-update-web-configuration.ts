import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpdateWebConfigurationMessage } from '@/views/settings/types/messages'
import {
  ConfigWebConfigurationFormat,
  ui_web_configuration_to_config_format
} from '@/views/utils/web-configuration-format-converters'
import { generate_unique_name } from '@/views/utils/generate-unique-name'
import { are_web_configurations_equal } from '@/views/utils/are-web-configurations-equal'

export const handle_update_web_configuration = async (
  settings_provider: SettingsProvider,
  message: UpdateWebConfigurationMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  const web_configuration_index = current_web_configurations.findIndex(
    (p) => p.name == message.updating_web_configuration.name
  )

  if (web_configuration_index == -1) {
    console.error(
      `web configuration with original name "${message.updating_web_configuration.name}" not found.`
    )
    vscode.window.showErrorMessage(
      dictionary.error_message.COULD_NOT_UPDATE_ITEM_NOT_FOUND(
        'web configuration',
        message.updating_web_configuration.name!
      )
    )
    return
  }

  const final_updated_web_configuration = { ...message.updated_web_configuration }

  const has_changes = !are_web_configurations_equal(
    message.updating_web_configuration,
    final_updated_web_configuration
  )

  if (!has_changes) {
    return
  }

  const updated_ui_web_configuration = { ...final_updated_web_configuration }

  const other_names = current_web_configurations
    .filter((_, index) => index != web_configuration_index)
    .map((c) => c.name)

  updated_ui_web_configuration.name = generate_unique_name(
    updated_ui_web_configuration.name,
    other_names
  )

  const updated_web_configurations = [...current_web_configurations]
  updated_web_configurations[web_configuration_index] = ui_web_configuration_to_config_format(
    updated_ui_web_configuration
  )

  await config.update(
    'webConfigurations',
    updated_web_configurations,
    vscode.ConfigurationTarget.Global
  )
}

import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { DeleteIntelligentUpdateConfigurationMessage } from '@/views/settings/types/messages'
import { dictionary } from '@shared/constants/dictionary'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }:${config.max_concurrency ?? ''}`

export const handle_delete_intelligent_update_configuration = async (
  provider: SettingsProvider,
  message: DeleteIntelligentUpdateConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const configuration_id_to_delete = message.configuration_id

  const original_configs =
    await providers_manager.get_intelligent_update_tool_configs()
  const config_to_delete = original_configs.find(
    (c) => generate_id(c) === configuration_id_to_delete
  )
  if (!config_to_delete) return

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.CONFIRM_DELETE_CONFIGURATION(
      config_to_delete.model,
      config_to_delete.provider_name
    ),
    { modal: true },
    'Delete'
  )

  if (confirmation !== 'Delete') {
    return
  }

  const original_default_config =
    await providers_manager.get_default_intelligent_update_config()

  const updated_configs = original_configs.filter(
    (c) => generate_id(c) !== configuration_id_to_delete
  )
  await providers_manager.save_intelligent_update_tool_configs(updated_configs)

  if (
    original_default_config &&
    generate_id(original_default_config) === configuration_id_to_delete
  ) {
    await providers_manager.set_default_intelligent_update_config(null)
  }
}

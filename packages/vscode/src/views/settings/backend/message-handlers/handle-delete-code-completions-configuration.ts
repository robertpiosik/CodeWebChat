import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { DeleteCodeCompletionsConfigurationMessage } from '@/views/settings/types/messages'
import { handle_get_code_completions_configurations } from './handle-get-code-completions-configurations'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }`

export const handle_delete_code_completions_configuration = async (
  provider: SettingsProvider,
  message: DeleteCodeCompletionsConfigurationMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const configuration_id_to_delete = message.configuration_id

  const original_configs =
    await providers_manager.get_code_completions_tool_configs()
  const config_to_delete = original_configs.find(
    (c) => generate_id(c) === configuration_id_to_delete
  )
  if (!config_to_delete) return

  const confirmation = await vscode.window.showWarningMessage(
    `Are you sure you want to delete the configuration for model "${config_to_delete.model}" provided by ${config_to_delete.provider_name}?`,
    { modal: true },
    'Delete'
  )

  if (confirmation !== 'Delete') {
    return
  }

  const original_default_config =
    await providers_manager.get_default_code_completions_config()

  const updated_configs = original_configs.filter(
    (c) => generate_id(c) !== configuration_id_to_delete
  )
  await providers_manager.save_code_completions_tool_configs(updated_configs)

  if (
    original_default_config &&
    generate_id(original_default_config) === configuration_id_to_delete
  ) {
    await providers_manager.set_default_code_completions_config(null)
  }
  await handle_get_code_completions_configurations(provider)
}

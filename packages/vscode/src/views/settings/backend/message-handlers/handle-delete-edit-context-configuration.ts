import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { DeleteEditContextConfigurationMessage } from '@/views/settings/types/messages'
import { dictionary } from '@shared/constants/dictionary'

export const handle_delete_edit_context_configuration = async (
  provider: SettingsProvider,
  message: DeleteEditContextConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const configuration_id_to_delete = message.configuration_id

  const original_configs =
    await providers_manager.get_edit_context_tool_configs()
  const config_to_delete = original_configs.find(
    (c) => get_tool_config_id(c) === configuration_id_to_delete
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
  const updated_configs = original_configs.filter(
    (c) => get_tool_config_id(c) !== configuration_id_to_delete
  )
  await providers_manager.save_edit_context_tool_configs(updated_configs)
}

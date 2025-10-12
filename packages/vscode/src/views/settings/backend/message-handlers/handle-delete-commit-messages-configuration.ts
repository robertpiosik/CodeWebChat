import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { DeleteCommitMessagesConfigurationMessage } from '@/views/settings/types/messages'
import { dictionary } from '@shared/constants/dictionary'

export const handle_delete_commit_messages_configuration = async (
  provider: SettingsProvider,
  message: DeleteCommitMessagesConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const configuration_id_to_delete = message.configuration_id

  const original_configs =
    await providers_manager.get_commit_messages_tool_configs()
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

  const original_default_config =
    await providers_manager.get_default_commit_messages_config()

  const updated_configs = original_configs.filter(
    (c) => get_tool_config_id(c) !== configuration_id_to_delete
  )
  await providers_manager.save_commit_messages_tool_configs(updated_configs)

  if (
    original_default_config &&
    get_tool_config_id(original_default_config) === configuration_id_to_delete
  ) {
    await providers_manager.set_default_commit_messages_config(null)
  }
}

import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'

export const delete_api_configuration = async (params: {
  context: vscode.ExtensionContext
  api_configuration_id: string
}): Promise<void> => {
  const providers_manager = new ModelProvidersManager(params.context)

  const original_api_configs = await providers_manager.get_tool_configs()
  const api_config_to_delete = original_api_configs.find(
    (c) => get_tool_config_id(c) === params.api_configuration_id
  )
  if (!api_config_to_delete) return

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: dictionary.warning_message.CONFIRM_DELETE_CONFIGURATION(
        api_config_to_delete.model,
        api_config_to_delete.provider_name
      )
    },
    'Delete'
  )

  if (confirmation != 'Delete') {
    return
  }

  const updated_api_configs = original_api_configs.filter(
    (c) => get_tool_config_id(c) !== params.api_configuration_id
  )
  await providers_manager.save_tool_configs(updated_api_configs)
}

import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_tool_config_id,
  ToolConfig
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'

export const delete_configuration = async (params: {
  context: vscode.ExtensionContext
  configuration_id: string
}): Promise<void> => {
  const providers_manager = new ModelProvidersManager(params.context)

  const original_configs =
    await providers_manager.get_code_completions_tool_configs()
  const config_to_delete = original_configs.find(
    (c) => get_tool_config_id(c) === params.configuration_id
  )
  if (!config_to_delete) return

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: dictionary.warning_message.CONFIRM_DELETE_CONFIGURATION(
        config_to_delete.model,
        config_to_delete.provider_name
      )
    },
    'Delete'
  )

  if (confirmation != 'Delete') {
    return
  }

  const updated_configs = original_configs.filter(
    (c) => get_tool_config_id(c) !== params.configuration_id
  )
  await providers_manager.save_code_completions_tool_configs(updated_configs)
}

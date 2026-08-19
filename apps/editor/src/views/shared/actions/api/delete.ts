import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

export const remove = async (params: {
  extension_context: vscode.ExtensionContext
  api_configuration_id: string
}): Promise<void> => {
  const providers_manager = new ModelProvidersManager(params.extension_context)

  const original_api_configurations =
    await providers_manager.get_api_configurations()
  const deleted_index = original_api_configurations.findIndex(
    (c) => get_api_configuration_id(c) === params.api_configuration_id
  )

  if (deleted_index === -1) return

  const api_config_to_delete = original_api_configurations[deleted_index]

  const delete_button = t('common.delete')
  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: dictionary.warning_message.CONFIRM_DELETE_CONFIGURATION(
        api_config_to_delete.model,
        api_config_to_delete.model_provider_name
      )
    },
    delete_button
  )

  if (confirmation != delete_button) {
    return
  }

  const updated_api_configurations = original_api_configurations.filter(
    (c) => get_api_configuration_id(c) !== params.api_configuration_id
  )
  await providers_manager.save_api_configurations(updated_api_configurations)

  const undo_action = t('views.shared.actions.api.delete.undo')
  const choice = await vscode.window.showInformationMessage(
    t('views.shared.actions.api.delete.deleted'),
    undo_action
  )

  if (choice === undo_action) {
    const current_api_configurations =
      await providers_manager.get_api_configurations()
    current_api_configurations.splice(deleted_index, 0, api_config_to_delete)
    await providers_manager.save_api_configurations(current_api_configurations)
  }
}

import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ApiConfiguration } from '../panel/types/messages'

export const update_api_configuration = async (params: {
  context: vscode.ExtensionContext
  updating_api_configuration: ApiConfiguration
  updated_api_configuration: ApiConfiguration
  origin?: 'cancel' | 'save'
}): Promise<{ success: boolean; has_changes: boolean; new_id?: string }> => {
  const providers_manager = new ModelProvidersManager(params.context)
  const api_configurations = await providers_manager.get_api_configurations()

  const api_configuration_index = api_configurations.findIndex(
    (p) => get_api_configuration_id(p) == params.updating_api_configuration.id
  )

  if (api_configuration_index == -1 && params.origin != 'cancel') {
    vscode.window.showErrorMessage(
      dictionary.error_message.COULD_NOT_UPDATE_ITEM_NOT_FOUND(
        'API configuration',
        params.updating_api_configuration.id
      )
    )
    return { success: false, has_changes: false }
  }

  const has_changes =
    params.updating_api_configuration.id !==
    get_api_configuration_id(params.updated_api_configuration)

  if (!has_changes) {
    return { success: true, has_changes: false }
  }

  if (params.origin == 'cancel') {
    const save_changes_button = 'Save'
    const result = await vscode.window.showWarningMessage(
      dictionary.information_message.CONFIRM_SAVE_CHANGES_TO_ITEM(
        'API configuration'
      ),
      {
        modal: true,
        detail:
          dictionary.information_message.UNSAVED_CHANGES_TO_ITEM_WILL_BE_LOST(
            'API configuration'
          )
      },
      save_changes_button
    )

    if (result != save_changes_button) {
      return { success: true, has_changes: false }
    }
  }

  const new_config = {
    ...api_configurations[api_configuration_index],
    model_provider_name: params.updated_api_configuration.model_provider_name,
    model: params.updated_api_configuration.model,
    temperature: params.updated_api_configuration.temperature,
    reasoning_effort: params.updated_api_configuration.reasoning_effort,
    system_instructions_override:
      params.updated_api_configuration.system_instructions_override
  }

  const new_id = get_api_configuration_id(new_config)

  // check if id already exists AND it's not the one we're editing
  if (
    new_id !== params.updating_api_configuration.id &&
    api_configurations.some((c) => get_api_configuration_id(c) === new_id)
  ) {
    vscode.window.showErrorMessage(
      dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
    )
    return { success: false, has_changes: true }
  }

  if (api_configuration_index !== -1) {
    api_configurations[api_configuration_index] = new_config
  } else {
    api_configurations.push(new_config)
  }

  await providers_manager.save_api_configurations(api_configurations)

  return {
    success: true,
    has_changes: true,
    new_id
  }
}

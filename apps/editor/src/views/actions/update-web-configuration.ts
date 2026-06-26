import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { WebConfiguration } from '@shared/types/web-configuration'
import {
  ConfigWebConfigurationFormat,
  ui_web_configuration_to_config_format
} from '@/utils/web-configuration-format-converters'
import { generate_unique_name } from '../utils/generate-unique-name'
import { are_web_configurations_equal } from '../utils/are-web-configurations-equal'

export const update_web_configuration = async (params: {
  updating_web_configuration: WebConfiguration
  updated_web_configuration: WebConfiguration
  origin?: 'cancel' | 'save'
  is_new?: boolean
  insertion_index?: number
}): Promise<{ success: boolean; has_changes: boolean; new_name?: string }> => {
  if (params.is_new && params.origin === 'cancel') {
    return { success: true, has_changes: false }
  }

  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  let web_configuration_index = -1
  if (!params.is_new) {
    web_configuration_index = current_web_configurations.findIndex(
      (p) => p.name == params.updating_web_configuration.name
    )

    if (web_configuration_index == -1 && params.origin != 'cancel') {
      console.error(
        `web configuration with original name "${params.updating_web_configuration.name}" not found.`
      )
      vscode.window.showErrorMessage(
        dictionary.error_message.COULD_NOT_UPDATE_ITEM_NOT_FOUND(
          'web configuration',
          params.updating_web_configuration.name!
        )
      )
      return { success: false, has_changes: false }
    }
  }

  const final_updated_web_configuration = {
    ...params.updated_web_configuration
  }

  const has_changes = !are_web_configurations_equal(
    params.updating_web_configuration,
    final_updated_web_configuration
  )

  if (!has_changes && !params.is_new) {
    return { success: true, has_changes: false }
  }

  if (params.origin == 'cancel') {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      dictionary.information_message.CONFIRM_DISCARD_UNSAVED_CHANGES(
        'web configuration'
      ),
      {
        modal: true,
        detail:
          dictionary.information_message.UNSAVED_CHANGES_TO_ITEM_WILL_BE_LOST(
            'web configuration'
          )
      },
      discard_button
    )

    if (result != discard_button) {
      return { success: false, has_changes: true }
    }

    return { success: true, has_changes: false }
  }

  const updated_ui_web_configuration = { ...final_updated_web_configuration }

  let other_names = current_web_configurations.map((c) => c.name)
  if (!params.is_new && web_configuration_index !== -1) {
    other_names = current_web_configurations
      .filter((_, index) => index != web_configuration_index)
      .map((c) => c.name)
  }

  updated_ui_web_configuration.name = generate_unique_name(
    updated_ui_web_configuration.name,
    other_names
  )

  const updated_web_configurations = [...current_web_configurations]
  if (params.is_new) {
    if (params.insertion_index !== undefined) {
      updated_web_configurations.splice(
        params.insertion_index,
        0,
        ui_web_configuration_to_config_format(updated_ui_web_configuration)
      )
    } else {
      updated_web_configurations.push(
        ui_web_configuration_to_config_format(updated_ui_web_configuration)
      )
    }
  } else if (web_configuration_index !== -1) {
    updated_web_configurations[web_configuration_index] =
      ui_web_configuration_to_config_format(updated_ui_web_configuration)
  }

  await config.update(
    'webConfigurations',
    updated_web_configurations,
    vscode.ConfigurationTarget.Global
  )

  return {
    success: true,
    has_changes: true,
    new_name: updated_ui_web_configuration.name
  }
}

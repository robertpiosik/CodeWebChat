import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { UpdateWebConfigurationMessage } from '@/views/panel/types/messages'
import { WebConfiguration } from '@shared/types/web-configuration'
import {
  ConfigWebConfigurationFormat,
  ui_web_configuration_to_config_format
} from '@/views/utils/web-configuration-format-converters'

export const handle_update_web_configuration = async (
  panel_provider: PanelProvider,
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

  const are_web_configurations_equal = (a: WebConfiguration, b: WebConfiguration): boolean => {
    return (
      a.name == b.name &&
      a.chatbot == b.chatbot &&
      a.model == b.model &&
      a.temperature === b.temperature &&
      a.top_p === b.top_p &&
      a.thinking_budget === b.thinking_budget &&
      a.reasoning_effort == b.reasoning_effort &&
      a.system_instructions == b.system_instructions &&
      JSON.stringify(a.options) == JSON.stringify(b.options) &&
      a.port == b.port &&
      a.new_url == b.new_url &&
      a.is_pinned == b.is_pinned
    )
  }

  const final_updated_web_configuration = { ...message.updated_web_configuration }

  const has_changes = !are_web_configurations_equal(
    message.updating_web_configuration,
    final_updated_web_configuration
  )

  if (!has_changes) {
    panel_provider.send_message({
      command: 'WEB_CONFIGURATION_UPDATED'
    })
    return
  }

  if (message.origin == 'back_button') {
    const save_changes_button = 'Save'
    const discard_changes = 'Discard changes'
    const result = await vscode.window.showInformationMessage(
      dictionary.information_message.CONFIRM_SAVE_CHANGES_TO_ITEM('web configuration'),
      {
        modal: true,
        detail: dictionary.information_message.UNSAVED_CHANGES_TO_ITEM_WILL_BE_LOST(
          'web configuration'
        )
      },
      save_changes_button,
      discard_changes
    )

    if (result == discard_changes) {
      panel_provider.send_message({
        command: 'WEB_CONFIGURATION_UPDATED'
      })
      return
    }

    if (result != save_changes_button) {
      return
    }
  }

  const updated_ui_web_configuration = { ...final_updated_web_configuration }
  if (!updated_ui_web_configuration.name || !updated_ui_web_configuration.name.trim()) {
    let counter = 1
    while (true) {
      const candidate = `(${counter})`
      const conflict = current_web_configurations.some(
        (p, index) => index != web_configuration_index && p.name == candidate
      )
      if (!conflict) {
        updated_ui_web_configuration.name = candidate
        break
      }
      counter++
    }
  }

  if (updated_ui_web_configuration.name) {
    let final_name = updated_ui_web_configuration.name.trim()

    let is_unique = false
    let copy_number = 0
    const base_name = final_name

    while (!is_unique) {
      const name_to_check =
        copy_number == 0 ? base_name : `${base_name} (${copy_number})`.trim()

      const conflict = current_web_configurations.some(
        (p, index) => index != web_configuration_index && p.name == name_to_check
      )

      if (!conflict) {
        final_name = name_to_check
        is_unique = true
      } else {
        copy_number++
      }
    }

    if (final_name != updated_ui_web_configuration.name) {
      updated_ui_web_configuration.name = final_name
    }
  }

  const updated_web_configurations = [...current_web_configurations]
  updated_web_configurations[web_configuration_index] = ui_web_configuration_to_config_format(
    updated_ui_web_configuration
  )

  await config.update(
    'webConfigurations',
    updated_web_configurations,
    vscode.ConfigurationTarget.Global
  )

  if (updated_ui_web_configuration && updated_ui_web_configuration.name) {
    panel_provider.send_message({
      command: 'SELECTED_WEB_CONFIGURATION_CHANGED',
      prompt_type: panel_provider.web_prompt_type,
      name: updated_ui_web_configuration.name
    })
  }

  panel_provider.send_message({
    command: 'WEB_CONFIGURATION_UPDATED'
  })
}

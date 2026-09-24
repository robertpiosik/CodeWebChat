import * as vscode from 'vscode'
import { CliConfiguration } from '@/types/cli-configuration'
import {
  ConfigAgentConfigurationFormat,
  ui_cli_configuration_to_config_format
} from '@/utils/cli-configuration-format-converters'
import { generate_unique_name } from '@/views/shared/utils/generate-unique-name'
import { t } from '@/i18n'

export const update = async (params: {
  updating_cli_configuration: CliConfiguration
  updated_cli_configuration: CliConfiguration
  origin?: 'cancel' | 'save'
  is_new?: boolean
  insertion_index?: number
}): Promise<{ success: boolean; has_changes: boolean; new_name?: string }> => {
  if (params.is_new && params.origin == 'cancel') {
    return { success: true, has_changes: false }
  }

  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_cli_configurations =
    config.get<ConfigAgentConfigurationFormat[]>('agents', []) || []

  let cli_configuration_index = -1
  if (!params.is_new) {
    cli_configuration_index = current_cli_configurations.findIndex(
      (p) => p.name == params.updating_cli_configuration.name
    )

    if (cli_configuration_index == -1 && params.origin != 'cancel') {
      console.error(
        `agent with original name "${params.updating_cli_configuration.name}" not found.`
      )
      vscode.window.showErrorMessage(
        t('common.error.could-not-update-item-not-found', {
          item_type: 'agent',
          name: params.updating_cli_configuration.name
        })
      )
      return { success: false, has_changes: false }
    }
  }

  const final_updated_cli_configuration = {
    ...params.updated_cli_configuration
  }

  const a = params.updating_cli_configuration
  const b = final_updated_cli_configuration
  const has_changes = !(
    a.name == b.name &&
    a.agent == b.agent &&
    a.flags == b.flags &&
    a.is_pinned == b.is_pinned
  )

  if (!has_changes && !params.is_new) {
    return { success: true, has_changes: false }
  }

  if (params.origin == 'cancel') {
    const discard_button = t('common.action.discard')
    const result = await vscode.window.showWarningMessage(
      t('views.common.handlers.common.confirm-discard-unsaved-changes', {
        item_type: 'agent'
      }),
      {
        modal: true,
        detail: t('views.common.handlers.common.unsaved-changes-will-be-lost', {
          item_type: 'agent'
        })
      },
      discard_button
    )

    if (result != discard_button) {
      return { success: false, has_changes: true }
    }

    return { success: true, has_changes: false }
  }

  const updated_ui_cli_configuration = { ...final_updated_cli_configuration }

  let other_names = current_cli_configurations.map((c) => c.name)
  if (!params.is_new && cli_configuration_index !== -1) {
    other_names = current_cli_configurations
      .filter((_, index) => index != cli_configuration_index)
      .map((c) => c.name)
  }

  updated_ui_cli_configuration.name = generate_unique_name(
    updated_ui_cli_configuration.name,
    other_names
  )

  const updated_cli_configurations = [...current_cli_configurations]
  if (params.is_new) {
    if (params.insertion_index !== undefined) {
      updated_cli_configurations.splice(
        params.insertion_index,
        0,
        ui_cli_configuration_to_config_format(updated_ui_cli_configuration)
      )
    } else {
      updated_cli_configurations.push(
        ui_cli_configuration_to_config_format(updated_ui_cli_configuration)
      )
    }
  } else if (cli_configuration_index != -1) {
    updated_cli_configurations[cli_configuration_index] = {
      ...updated_cli_configurations[cli_configuration_index],
      ...ui_cli_configuration_to_config_format(updated_ui_cli_configuration)
    }
  }

  await config.update(
    'agents',
    updated_cli_configurations,
    vscode.ConfigurationTarget.Global
  )

  return {
    success: true,
    has_changes: true,
    new_name: updated_ui_cli_configuration.name
  }
}
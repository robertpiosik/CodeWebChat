import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { EditEditContextConfigurationMessage } from '@/views/settings/types/messages'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_instructions_placement_for_config,
  edit_model_for_config,
  edit_provider_for_config,
  edit_reasoning_effort_for_config,
  edit_temperature_for_config
} from './config-editing-helpers'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }:${config.instructions_placement ?? ''}`

export const handle_edit_edit_context_configuration = async (
  provider: SettingsProvider,
  message: EditEditContextConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()
  let configs = await providers_manager.get_edit_context_tool_configs()
  let config_index = configs.findIndex(
    (c) => generate_id(c) === message.configuration_id
  )

  if (config_index == -1) {
    vscode.window.showErrorMessage(
      dictionary.error_message.CONFIGURATION_NOT_FOUND
    )
    return
  }

  let config_to_edit = configs[config_index]

  type EditOption =
    | 'Provider'
    | 'Model'
    | 'Temperature'
    | 'Reasoning Effort'
    | 'Instructions Placement'

  const show_quick_pick = async (): Promise<boolean> => {
    const items: vscode.QuickPickItem[] = [
      { label: 'Provider', detail: config_to_edit.provider_name },
      { label: 'Model', detail: config_to_edit.model },
      { label: 'Temperature', detail: String(config_to_edit.temperature) },
      {
        label: 'Reasoning Effort',
        description: 'Requires supporting model',
        detail: config_to_edit.reasoning_effort ?? 'auto'
      },
      {
        label: 'Instructions Placement',
        detail:
          (config_to_edit.instructions_placement ?? 'above-and-below') ==
          'below-only'
            ? 'Below Only'
            : 'Above and Below'
      }
    ]

    const selected_item = await vscode.window.showQuickPick(items, {
      title: 'Edit Configuration',
      placeHolder: 'Select a property to edit'
    })

    if (!selected_item) {
      return false
    }

    const updated_config = { ...config_to_edit }
    const selected_option = selected_item.label as EditOption

    switch (selected_option) {
      case 'Provider': {
        const new_provider = await edit_provider_for_config(providers_manager)
        if (new_provider) {
          updated_config.provider_name = new_provider.provider_name
          updated_config.provider_type = new_provider.provider_type
        } else {
          return await show_quick_pick()
        }
        break
      }
      case 'Model': {
        const new_model = await edit_model_for_config(
          config_to_edit,
          providers_manager,
          model_fetcher
        )
        if (new_model !== undefined && new_model !== config_to_edit.model) {
          updated_config.model = new_model
        } else {
          // User cancelled or didn't change the model
          return await show_quick_pick()
        }

        break
      }
      case 'Temperature': {
        const new_temp = await edit_temperature_for_config(config_to_edit)
        if (new_temp !== undefined) {
          updated_config.temperature = new_temp
        } else {
          return await show_quick_pick()
        }
        break
      }
      case 'Reasoning Effort': {
        const new_effort = await edit_reasoning_effort_for_config()
        if (new_effort !== undefined) {
          updated_config.reasoning_effort = new_effort as any
        } else {
          return await show_quick_pick()
        }
        break
      }
      case 'Instructions Placement': {
        const new_placement = await edit_instructions_placement_for_config()
        if (new_placement !== undefined) {
          updated_config.instructions_placement = new_placement as any
        } else {
          return await show_quick_pick()
        }
        break
      }
    }

    const new_id = generate_id(updated_config)
    if (
      new_id !== message.configuration_id &&
      configs.some((c) => generate_id(c) === new_id)
    ) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
      )
      return await show_quick_pick()
    }

    const updated_configs = [...configs]
    updated_configs[config_index] = updated_config
    await providers_manager.save_edit_context_tool_configs(updated_configs)

    if (
      selected_option === 'Model' &&
      updated_config.model !== config_to_edit.model
    ) {
      configs = updated_configs
      message.configuration_id = new_id
      config_index = configs.findIndex((c) => generate_id(c) === new_id)
      config_to_edit = configs[config_index]
      return await show_quick_pick()
    }

    return true
  }

  await show_quick_pick()
}

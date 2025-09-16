import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { handle_get_intelligent_update_configurations } from './handle-get-intelligent-update-configurations'
import { ModelFetcher } from '@/services/model-fetcher'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import {
  edit_max_concurrency_for_config,
  edit_model_for_config,
  edit_provider_for_config,
  edit_reasoning_effort_for_config,
  edit_temperature_for_config,
  initial_select_model,
  initial_select_provider
} from './config-editing-helpers'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }:${config.max_concurrency ?? ''}`

export const handle_add_intelligent_update_configuration = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()

  const selected_provider = await initial_select_provider(providers_manager)
  if (!selected_provider) return

  const selected_model = await initial_select_model(
    model_fetcher,
    selected_provider
  )
  if (!selected_model) return

  const config_to_add: ToolConfig = {
    provider_type: selected_provider.type,
    provider_name: selected_provider.name,
    model: selected_model,
    temperature: DEFAULT_TEMPERATURE['intelligent-update']
  }

  type EditOption =
    | 'Provider'
    | 'Model'
    | 'Temperature'
    | 'Reasoning Effort'
    | 'Max Concurrency'

  const show_quick_pick = async (): Promise<boolean> => {
    const items: vscode.QuickPickItem[] = [
      { label: 'Provider', detail: config_to_add.provider_name },
      { label: 'Model', detail: config_to_add.model },
      { label: 'Temperature', detail: `${config_to_add.temperature}` },
      {
        label: 'Reasoning Effort',
        description: 'Requires supporting model',
        detail: config_to_add.reasoning_effort ?? 'auto'
      },
      {
        label: 'Max Concurrency',
        detail: `${config_to_add.max_concurrency ?? 1}`
      }
    ]

    const selected_item = await vscode.window.showQuickPick(items, {
      title: 'Create New Configuration',
      placeHolder: 'Select a property to edit, or press Esc to save'
    })

    if (!selected_item) {
      return false
    }

    const selected_option = selected_item.label as EditOption

    switch (selected_option) {
      case 'Provider': {
        const new_provider = await edit_provider_for_config(providers_manager)
        if (new_provider) {
          config_to_add.provider_name = new_provider.provider_name
          config_to_add.provider_type = new_provider.provider_type
        }
        break
      }
      case 'Model': {
        const new_model = await edit_model_for_config(
          config_to_add,
          providers_manager,
          model_fetcher
        )
        if (new_model !== undefined) {
          config_to_add.model = new_model
        }
        break
      }
      case 'Temperature': {
        const new_temp = await edit_temperature_for_config(config_to_add)
        if (new_temp !== undefined) {
          config_to_add.temperature = new_temp
        }
        break
      }
      case 'Reasoning Effort': {
        const new_effort = await edit_reasoning_effort_for_config()
        if (new_effort !== undefined) {
          config_to_add.reasoning_effort = new_effort as any
        }
        break
      }
      case 'Max Concurrency': {
        const new_concurrency = await edit_max_concurrency_for_config(
          config_to_add
        )
        if (new_concurrency !== undefined) {
          config_to_add.max_concurrency = new_concurrency as any
        }
        break
      }
    }
    return await show_quick_pick()
  }

  await show_quick_pick()

  const configs = await providers_manager.get_intelligent_update_tool_configs()
  if (configs.some((c) => generate_id(c) == generate_id(config_to_add))) {
    vscode.window.showWarningMessage(
      'A configuration with these properties already exists.'
    )
    return
  }

  configs.push(config_to_add)
  await providers_manager.save_intelligent_update_tool_configs(configs)

  await handle_get_intelligent_update_configurations(provider)
}

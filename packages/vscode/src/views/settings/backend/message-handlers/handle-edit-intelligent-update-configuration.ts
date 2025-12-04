import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { EditIntelligentUpdateConfigurationMessage } from '@/views/settings/types/messages'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_max_concurrency_for_config,
  edit_model_for_config,
  edit_provider_for_config,
  edit_reasoning_effort_for_config,
  edit_temperature_for_config
} from '../../utils/config-editing'
import { dictionary } from '@shared/constants/dictionary'

export const handle_edit_intelligent_update_configuration = async (
  provider: SettingsProvider,
  message: EditIntelligentUpdateConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()
  const configs = await providers_manager.get_intelligent_update_tool_configs()
  const config_index = configs.findIndex(
    (c) => get_tool_config_id(c) === message.configuration_id
  )

  if (config_index == -1) {
    vscode.window.showErrorMessage(
      dictionary.error_message.CONFIGURATION_NOT_FOUND
    )
    return
  }

  const config_to_edit = configs[config_index]
  const updated_config = { ...config_to_edit }

  type EditOption =
    | 'Provider'
    | 'Model'
    | 'Temperature'
    | 'Reasoning Effort'
    | 'Max Concurrency'

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const items: vscode.QuickPickItem[] = [
      { label: 'Provider', detail: updated_config.provider_name },
      { label: 'Model', detail: updated_config.model },
      { label: 'Temperature', detail: `${updated_config.temperature}` },
      {
        label: 'Reasoning Effort',
        description: 'Requires supporting model',
        detail: updated_config.reasoning_effort ?? 'auto'
      },
      {
        label: 'Max Concurrency',
        detail: `${updated_config.max_concurrency ?? 1}`
      }
    ]

    const selected_item = await vscode.window.showQuickPick(items, {
      title: 'Edit Configuration',
      placeHolder: 'Select a property to edit'
    })

    if (!selected_item) {
      break
    }

    const selected_option = selected_item.label as EditOption

    switch (selected_option) {
      case 'Provider': {
        const new_provider = await edit_provider_for_config(providers_manager)
        if (new_provider) {
          updated_config.provider_name = new_provider.provider_name
          updated_config.provider_type = new_provider.provider_type
        }
        break
      }
      case 'Model': {
        const new_model = await edit_model_for_config(
          updated_config,
          providers_manager,
          model_fetcher
        )
        if (new_model !== undefined) {
          updated_config.model = new_model
        }
        break
      }
      case 'Temperature': {
        const new_temp = await edit_temperature_for_config(updated_config)
        if (new_temp !== undefined) {
          updated_config.temperature = new_temp
        }
        break
      }
      case 'Reasoning Effort': {
        const new_effort = await edit_reasoning_effort_for_config()
        if (new_effort !== undefined) {
          updated_config.reasoning_effort = new_effort as any
        }
        break
      }
      case 'Max Concurrency': {
        const new_concurrency =
          await edit_max_concurrency_for_config(updated_config)
        if (new_concurrency !== undefined) {
          updated_config.max_concurrency = new_concurrency as any
        }
        break
      }
    }
  }

  if (JSON.stringify(config_to_edit) === JSON.stringify(updated_config)) {
    return
  }

  const new_id = get_tool_config_id(updated_config)
  if (
    new_id !== message.configuration_id &&
    configs.some((c) => get_tool_config_id(c) === new_id)
  ) {
    vscode.window.showErrorMessage(
      dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
    )
    return
  }

  const updated_configs = [...configs]
  updated_configs[config_index] = updated_config
  await providers_manager.save_intelligent_update_tool_configs(updated_configs)
}

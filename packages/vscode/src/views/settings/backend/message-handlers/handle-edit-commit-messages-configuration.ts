import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { DICTIONARY } from '@/constants/dictionary'
import { EditCommitMessagesConfigurationMessage } from '@/views/settings/types/messages'
import { handle_get_commit_messages_configurations } from './handle-get-commit-messages-configurations'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_model_for_config,
  edit_provider_for_config,
  edit_reasoning_effort_for_config,
  edit_temperature_for_config
} from './config-editing-helpers'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }`

export const handle_edit_commit_messages_configuration = async (
  provider: SettingsProvider,
  message: EditCommitMessagesConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()
  let configs = await providers_manager.get_commit_messages_tool_configs()
  let config_index = configs.findIndex(
    (c) => generate_id(c) === message.configuration_id
  )

  if (config_index == -1) {
    vscode.window.showErrorMessage(
      DICTIONARY.error_message.CONFIGURATION_NOT_FOUND
    )
    return
  }

  let config_to_edit = configs[config_index]

  type EditOption = 'Provider' | 'Model' | 'Temperature' | 'Reasoning Effort'

  const show_quick_pick = async (): Promise<boolean> => {
    const items: vscode.QuickPickItem[] = [
      { label: 'Provider', detail: config_to_edit.provider_name },
      { label: 'Model', detail: config_to_edit.model },
      { label: 'Temperature', detail: `${config_to_edit.temperature}` },
      {
        label: 'Reasoning Effort',
        description: 'Requires supporting model',
        detail: config_to_edit.reasoning_effort ?? 'auto'
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
    }

    const new_id = generate_id(updated_config)
    if (
      new_id !== message.configuration_id &&
      configs.some((c) => generate_id(c) === new_id)
    ) {
      vscode.window.showErrorMessage(
        DICTIONARY.error_message.CONFIGURATION_ALREADY_EXISTS
      )
      return await show_quick_pick()
    }

    const updated_configs = [...configs]
    updated_configs[config_index] = updated_config
    await providers_manager.save_commit_messages_tool_configs(updated_configs)

    if (
      selected_option === 'Model' &&
      updated_config.model !== config_to_edit.model
    ) {
      await handle_get_commit_messages_configurations(provider)
      configs = updated_configs
      message.configuration_id = new_id
      config_index = configs.findIndex((c) => generate_id(c) === new_id)
      config_to_edit = configs[config_index]
      return await show_quick_pick()
    }

    return true
  }

  await show_quick_pick()
  await handle_get_commit_messages_configurations(provider)
}

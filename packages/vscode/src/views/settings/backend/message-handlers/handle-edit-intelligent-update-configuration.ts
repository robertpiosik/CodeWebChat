import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { EditIntelligentUpdateConfigurationMessage } from '@/views/settings/types/messages'
import { handle_get_intelligent_update_configurations } from './handle-get-intelligent-update-configurations'
import {
  ModelFetcher,
  MODELS_ROUTE_NOT_FOUND_ERROR
} from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'
import { Logger } from '@shared/utils/logger'
import { DICTIONARY } from '@/constants/dictionary'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }:${config.max_concurrency ?? ''}`

export const handle_edit_intelligent_update_configuration = async (
  provider: SettingsProvider,
  message: EditIntelligentUpdateConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()
  let configs = await providers_manager.get_intelligent_update_tool_configs()
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

  type EditOption =
    | 'Provider'
    | 'Model'
    | 'Temperature'
    | 'Reasoning Effort'
    | 'Max Concurrency'

  const show_quick_pick = async (): Promise<boolean> => {
    const items: vscode.QuickPickItem[] = [
      { label: 'Provider', detail: config_to_edit.provider_name },
      { label: 'Model', detail: config_to_edit.model },
      { label: 'Temperature', detail: `${config_to_edit.temperature}` },
      {
        label: 'Reasoning Effort',
        description: 'Requires supporting model',
        detail: config_to_edit.reasoning_effort ?? 'auto'
      },
      {
        label: 'Max Concurrency',
        detail: `${config_to_edit.max_concurrency ?? 1}`
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
        const providers = await providers_manager.get_providers()
        const provider_items = providers.map((p) => ({
          label: p.name,
          detail: p.type,
          provider: p
        }))
        const selected_provider_item = await vscode.window.showQuickPick(
          provider_items,
          {
            title: 'Select a Provider'
          }
        )
        if (selected_provider_item) {
          updated_config.provider_name = selected_provider_item.provider.name
          updated_config.provider_type = selected_provider_item.provider.type
        } else {
          return await show_quick_pick()
        }
        break
      }
      case 'Model': {
        const provider_info = {
          type: config_to_edit.provider_type,
          name: config_to_edit.provider_name
        }

        const provider_from_manager = await providers_manager.get_provider(
          provider_info.name
        )
        if (!provider_from_manager) {
          vscode.window.showErrorMessage(
            DICTIONARY.error_message.PROVIDER_NOT_FOUND(provider_info.name)
          )
          return await show_quick_pick()
        }

        const base_url =
          provider_from_manager.type == 'built-in'
            ? PROVIDERS[provider_from_manager.name]?.base_url
            : provider_from_manager.base_url

        if (!base_url) {
          vscode.window.showErrorMessage(
            DICTIONARY.error_message.BASE_URL_NOT_FOUND_FOR_PROVIDER(
              provider_info.name
            )
          )
          return await show_quick_pick()
        }

        let new_model_value: string | undefined
        let model_selected = false

        try {
          const models = await model_fetcher.get_models({
            base_url,
            api_key: provider_from_manager.api_key
          })

          if (models.length > 0) {
            const model_items = models.map((model) => ({
              label: model.name || model.id,
              description: model.name ? model.id : undefined,
              detail: model.description
            }))

            const selected_model_item = await vscode.window.showQuickPick(
              model_items,
              {
                title: 'Select Model',
                placeHolder: 'Choose an AI model'
              }
            )

            if (selected_model_item) {
              new_model_value =
                selected_model_item.description || selected_model_item.label
              model_selected = true
            }
          } else {
            vscode.window.showWarningMessage(
              `No models found for ${provider_info.name}. You can enter model name manually.`
            )
          }
        } catch (error) {
          Logger.error({
            function_name:
              'handle_edit_intelligent_update_configuration case Model',
            message: 'Failed to fetch models',
            data: error
          })
          if (
            error instanceof Error &&
            error.message == MODELS_ROUTE_NOT_FOUND_ERROR
          ) {
            vscode.window.showInformationMessage(
              `The '/models' route was not found for ${provider_info.name}. This might mean the provider does not support listing models. You can enter model name manually.`
            )
          } else {
            vscode.window.showErrorMessage(
              DICTIONARY.error_message.FAILED_TO_FETCH_MODELS(
                error instanceof Error ? error.message : String(error)
              )
            )
          }
        }

        if (!model_selected) {
          const new_model_input = await vscode.window.showInputBox({
            title: 'Enter Model Name',
            value: config_to_edit.model,
            prompt: `Enter a model name (ID)`
          })
          if (new_model_input !== undefined) {
            new_model_value = new_model_input
          }
        }

        if (
          new_model_value !== undefined &&
          new_model_value.trim() !== config_to_edit.model
        ) {
          updated_config.model = new_model_value.trim()
        } else {
          // User cancelled or didn't change the model
          return await show_quick_pick()
        }

        break
      }
      case 'Temperature': {
        const new_temp_str = await vscode.window.showInputBox({
          title: 'Edit Temperature',
          value: String(config_to_edit.temperature),
          prompt: 'Enter a value between 0 and 2',
          validateInput: (value) => {
            const num = parseFloat(value)
            if (isNaN(num) || num < 0 || num > 2) {
              return 'Please enter a number between 0 and 2.'
            }
            return null
          }
        })
        if (new_temp_str !== undefined) {
          updated_config.temperature = parseFloat(new_temp_str)
        } else {
          return await show_quick_pick()
        }
        break
      }
      case 'Reasoning Effort': {
        const effort_options: ('auto' | 'low' | 'medium' | 'high')[] = [
          'auto',
          'low',
          'medium',
          'high'
        ]
        const selected_effort = await vscode.window.showQuickPick(
          effort_options,
          {
            title: 'Select Reasoning Effort'
          }
        )
        if (selected_effort !== undefined) {
          updated_config.reasoning_effort = selected_effort as any
        } else {
          return await show_quick_pick()
        }
        break
      }
      case 'Max Concurrency': {
        const new_concurrency_str = await vscode.window.showInputBox({
          title: 'Edit Max Concurrency',
          value: String(config_to_edit.max_concurrency ?? 1),
          prompt: 'Enter a number for max concurrency',
          validateInput: (value) => {
            const num = parseInt(value, 10)
            if (isNaN(num) || !Number.isInteger(num) || num < 1) {
              return 'Please enter a whole number greater than or equal to 1.'
            }
            return null
          }
        })
        if (new_concurrency_str !== undefined) {
          updated_config.max_concurrency = parseInt(new_concurrency_str, 10)
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
    await providers_manager.save_intelligent_update_tool_configs(
      updated_configs
    )

    if (
      selected_option === 'Model' &&
      updated_config.model !== config_to_edit.model
    ) {
      await handle_get_intelligent_update_configurations(provider)
      configs = updated_configs
      message.configuration_id = new_id
      config_index = configs.findIndex((c) => generate_id(c) === new_id)
      config_to_edit = configs[config_index]
      return await show_quick_pick()
    }

    return true
  }

  await show_quick_pick()
  await handle_get_intelligent_update_configurations(provider)
}

import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  Provider,
  ToolConfig
} from '@/services/api-providers-manager'
import { handle_get_intelligent_update_configurations } from './handle-get-intelligent-update-configurations'
import {
  ModelFetcher,
  MODELS_ROUTE_NOT_FOUND_ERROR
} from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'
import { Logger } from '@shared/utils/logger'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }:${config.max_concurrency ?? ''}`

const select_provider = async (
  providers_manager: ApiProvidersManager
): Promise<Provider | undefined> => {
  const providers = await providers_manager.get_providers()

  if (providers.length === 0) {
    vscode.window.showWarningMessage(
      'No API providers configured. Please add an API provider first on the "API Providers" page.'
    )
    return
  }

  const provider_items = providers.map((p) => ({ label: p.name, provider: p }))
  const selected = await vscode.window.showQuickPick(provider_items, {
    title: 'Select a Provider'
  })

  return selected?.provider
}

const select_model = async (
  model_fetcher: ModelFetcher,
  provider: Provider
): Promise<string | undefined> => {
  try {
    const base_url =
      provider.type == 'built-in'
        ? PROVIDERS[provider.name]?.base_url
        : provider.base_url
    if (!base_url)
      throw new Error(`Base URL not found for provider ${provider.name}`)

    const models = await model_fetcher.get_models({
      base_url,
      api_key: provider.api_key
    })

    if (models.length > 0) {
      const model_items = models.map((model) => ({
        label: model.name || model.id,
        description: model.name ? model.id : undefined,
        detail: model.description
      }))
      const selected = await vscode.window.showQuickPick(model_items, {
        title: 'Select Model',
        placeHolder: 'Choose an AI model'
      })
      if (selected) return selected.description || selected.label
      return // User cancelled
    }
  } catch (error) {
    Logger.error({
      function_name: 'select_model',
      message: 'Failed to fetch models',
      data: error
    })
    if (
      error instanceof Error &&
      error.message == MODELS_ROUTE_NOT_FOUND_ERROR
    ) {
      vscode.window.showInformationMessage(
        `The '/models' route was not found for ${provider.name}. This might mean the provider does not support listing models.`
      )
    } else {
      vscode.window.showErrorMessage(
        `Failed to fetch models: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return await vscode.window.showInputBox({
    title: 'Enter Model Name',
    prompt: 'Could not fetch models. Please enter a model name (ID).'
  })
}

export const handle_add_intelligent_update_configuration = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()

  const selected_provider = await select_provider(providers_manager)
  if (!selected_provider) return

  const selected_model = await select_model(model_fetcher, selected_provider)
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
        const providers = await providers_manager.get_providers()
        const provider_items = providers.map((p) => ({
          label: p.name,
          detail: p.type,
          provider: p
        }))
        const selected_provider_item = await vscode.window.showQuickPick(
          provider_items,
          { title: 'Select a Provider' }
        )
        if (selected_provider_item) {
          config_to_add.provider_name = selected_provider_item.provider.name
          config_to_add.provider_type = selected_provider_item.provider.type
        }
        break
      }
      case 'Model': {
        const provider_from_manager = await providers_manager.get_provider(
          config_to_add.provider_name
        )
        if (!provider_from_manager) {
          vscode.window.showErrorMessage(
            `Provider ${config_to_add.provider_name} not found.`
          )
          break
        }

        const base_url =
          provider_from_manager.type == 'built-in'
            ? PROVIDERS[provider_from_manager.name]?.base_url
            : provider_from_manager.base_url

        if (!base_url) {
          vscode.window.showErrorMessage(
            `Base URL not found for provider ${config_to_add.provider_name}.`
          )
          break
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
              { title: 'Select Model', placeHolder: 'Choose an AI model' }
            )
            if (selected_model_item) {
              new_model_value =
                selected_model_item.description || selected_model_item.label
              model_selected = true
            }
          }
        } catch (error) {
          Logger.error({
            function_name: 'add_intelligent_update_configuration case Model',
            message: 'Failed to fetch models',
            data: error
          })
        }

        if (!model_selected) {
          const new_model_input = await vscode.window.showInputBox({
            title: 'Enter Model Name',
            value: config_to_add.model,
            prompt: `Enter a model name (ID)`
          })
          if (new_model_input !== undefined) new_model_value = new_model_input
        }

        if (new_model_value !== undefined)
          config_to_add.model = new_model_value.trim()
        break
      }
      case 'Temperature': {
        const new_temp_str = await vscode.window.showInputBox({
          title: 'Edit Temperature',
          value: String(config_to_add.temperature),
          prompt: 'Enter a value between 0 and 2',
          validateInput: (value) =>
            !/^[0-2](\.\d+)?$/.test(value) || parseFloat(value) > 2
              ? 'Please enter a number between 0 and 2.'
              : null
        })
        if (new_temp_str !== undefined)
          config_to_add.temperature = parseFloat(new_temp_str)
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
          { title: 'Select Reasoning Effort' }
        )
        if (selected_effort !== undefined)
          config_to_add.reasoning_effort = selected_effort as any
        break
      }
      case 'Max Concurrency': {
        const new_concurrency_str = await vscode.window.showInputBox({
          title: 'Edit Max Concurrency',
          value: String(config_to_add.max_concurrency ?? 1),
          prompt: 'Enter a number for max concurrency',
          validateInput: (value) => {
            const num = parseInt(value, 10)
            if (isNaN(num) || !Number.isInteger(num) || num < 1) {
              return 'Please enter a whole number greater than or equal to 1.'
            }
            return null
          }
        })
        if (new_concurrency_str !== undefined)
          config_to_add.max_concurrency = parseInt(new_concurrency_str, 10)
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

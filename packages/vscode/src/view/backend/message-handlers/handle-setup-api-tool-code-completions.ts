import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import {
  ApiProvidersManager,
  Provider,
  ToolConfig,
} from '@/services/api-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'

export const handle_setup_api_tool_code_completions = async (
  provider: ViewProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()
  const default_temperature = 0.2

  const current_configs = providers_manager.get_code_completions_tool_config()

  // Main options for managing configurations
  const add_option = 'Add new configuration'
  const edit_option = 'Edit configuration'
  const remove_option = 'Remove configuration'
  const done_option = 'Done'

  await manage_configurations()

  async function manage_configurations() {
    const options = [add_option]

    if (current_configs.length > 0) {
      options.push(edit_option, remove_option)
    }

    options.push(done_option)

    const config_status =
      current_configs.length === 0
        ? 'No configurations set up'
        : `${current_configs.length} configuration(s) set up`

    const selection = await vscode.window.showQuickPick(options, {
      title: 'Code Completions Configuration',
      placeHolder: config_status
    })

    if (!selection) return

    switch (selection) {
      case add_option:
        await add_configuration()
        break
      case edit_option:
        await edit_configuration()
        break
      case remove_option:
        await remove_configuration()
        break
      case done_option:
        return
    }
  }

  async function add_configuration() {
    // Step 1: Select provider
    const provider_info = await select_provider()
    if (!provider_info) {
      await manage_configurations()
      return
    }

    // Step 2: Select model
    const model = await select_model(provider_info)
    if (!model) {
      await manage_configurations()
      return
    }

    // Check if this provider/model combination already exists
    const provider_model_exists = current_configs.some(
      (config) =>
        config.provider_type === provider_info.type &&
        config.provider_name === provider_info.name &&
        config.model === model
    )

    if (provider_model_exists) {
      vscode.window.showErrorMessage(
        `A configuration for ${provider_info.name} / ${model} already exists.`
      )
      await manage_configurations()
      return
    }

    // Step 3: Set temperature
    const temperature = await set_temperature(default_temperature)
    if (temperature === undefined) {
      await manage_configurations()
      return
    }

    const new_config: ToolConfig = {
      provider_type: provider_info.type,
      provider_name: provider_info.name,
      model,
      temperature
    }

    current_configs.push(new_config)
    await providers_manager.save_code_completions_tool_config(current_configs)
    vscode.window.showInformationMessage(
      `Added configuration: ${provider_info.name} / ${model}`
    )

    await manage_configurations()
  }

  async function edit_configuration() {
    if (current_configs.length === 0) {
      await manage_configurations()
      return
    }

    // Select which configuration to edit
    const config_items = current_configs.map((config, index) => ({
      label: `${config.provider_name} / ${config.model}`,
      description: `Temperature: ${config.temperature}`,
      index
    }))

    const selected = await vscode.window.showQuickPick(config_items, {
      title: 'Select Configuration to Edit',
      placeHolder: 'Choose a configuration to edit'
    })

    if (!selected) {
      await manage_configurations()
      return
    }

    const config = current_configs[selected.index]

    // Choose what to edit
    const temperature_label = 'Temperature'
    const options = [
      {
        label: temperature_label,
        description: `${config.temperature} (current)`
      }
    ]

    const edit_selection = await vscode.window.showQuickPick(options, {
      title: `Edit ${config.provider_name} / ${config.model} Configuration`,
      placeHolder: 'Select setting to update'
    })

    if (!edit_selection) {
      await manage_configurations()
      return
    }

    if (edit_selection.label === temperature_label) {
      const new_temperature = await set_temperature(config.temperature)
      if (new_temperature !== undefined) {
        current_configs[selected.index].temperature = new_temperature
        await providers_manager.save_code_completions_tool_config(
          current_configs
        )
        vscode.window.showInformationMessage(
          `Updated temperature for ${config.provider_name} / ${config.model}`
        )
      }
    }

    await manage_configurations()
  }

  async function remove_configuration() {
    if (current_configs.length === 0) {
      await manage_configurations()
      return
    }

    const config_items = current_configs.map((config, index) => ({
      label: `${config.provider_name} / ${config.model}`,
      description: `Temperature: ${config.temperature}`,
      index
    }))

    const selected = await vscode.window.showQuickPick(config_items, {
      title: 'Select Configuration to Remove',
      placeHolder: 'Choose a configuration to remove'
    })

    if (!selected) {
      await manage_configurations()
      return
    }

    const config = current_configs[selected.index]
    const confirmation = await vscode.window.showQuickPick(['Yes', 'No'], {
      title: `Remove ${config.provider_name} / ${config.model}?`,
      placeHolder: 'Confirm removal'
    })

    if (confirmation === 'Yes') {
      current_configs.splice(selected.index, 1)
      await providers_manager.save_code_completions_tool_config(current_configs)
      vscode.window.showInformationMessage(
        `Removed configuration: ${config.provider_name} / ${config.model}`
      )
    }

    await manage_configurations()
  }

  async function select_provider(): Promise<
    Pick<Provider, 'type' | 'name'> | undefined
  > {
    const providers = providers_manager.get_providers()

    if (providers.length == 0) {
      vscode.window.showErrorMessage(
        'No API providers configured. Please configure an API provider first.'
      )
      return undefined
    }

    const provider_items = providers.map((p) => ({
      label: p.name,
      description: p.type == 'built-in' ? 'Built-in' : 'Custom',
      provider: p
    }))

    const selected = await vscode.window.showQuickPick(provider_items, {
      title: 'Select API Provider',
      placeHolder: 'Choose an API provider'
    })

    if (!selected) return undefined

    return {
      type: selected.provider.type,
      name: selected.provider.name
    }
  }

  async function select_model(
    provider_info: Pick<Provider, 'type' | 'name'>
  ): Promise<string | undefined> {
    try {
      const provider = providers_manager.get_provider(provider_info.name)
      if (!provider) {
        throw new Error(`Provider ${provider_info.name} not found`)
      }

      const base_url =
        provider.type == 'built-in'
          ? PROVIDERS[provider.name].base_url
          : provider.base_url

      if (!base_url) {
        throw new Error(`Base URL not found for provider ${provider_info.name}`)
      }

      const models = await model_fetcher.get_models({
        base_url,
        api_key: provider.api_key
      })

      if (!models.length) {
        vscode.window.showWarningMessage(
          `No models found for ${provider_info.name}.`
        )
      }

      const model_items = models.map((model) => ({
        label: model.name || model.id,
        description: model.name ? model.id : undefined,
        detail: model.description
      }))

      const selected = await vscode.window.showQuickPick(model_items, {
        title: 'Select Model',
        placeHolder: 'Choose an AI model'
      })

      return selected?.label
    } catch (error) {
      console.error('Error fetching models:', error)
      vscode.window.showErrorMessage(
        `Failed to fetch models: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  async function set_temperature(
    temperature: number
  ): Promise<number | undefined> {
    const temperature_input = await vscode.window.showInputBox({
      title: 'Set Temperature',
      prompt: 'Enter a value between 0 and 1 (required)',
      value: temperature.toString(),
      placeHolder: '',
      validateInput: (value) => {
        const num = Number(value)
        if (isNaN(num)) return 'Please enter a valid number'
        if (num < 0 || num > 1) return 'Temperature must be between 0 and 1'
        return null
      }
    })

    if (temperature_input === undefined || temperature_input == '') {
      return default_temperature
    }

    return Number(temperature_input)
  }
}

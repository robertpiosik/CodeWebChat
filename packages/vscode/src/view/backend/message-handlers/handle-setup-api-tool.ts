import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import {
  ApiProvidersManager,
  Provider,
  ToolConfig
} from '@/services/api-providers-manager'

export const handle_setup_api_tool = async (
  provider: ViewProvider,
  tool: 'file-refactoring' | 'commit-messages'
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)

  const get_tool_config = () => {
    return tool == 'file-refactoring'
      ? providers_manager.get_file_refactoring_tool_config()
      : providers_manager.get_commit_messages_tool_config()
  }

  const save_tool_config = async (config: ToolConfig) => {
    if (tool == 'file-refactoring') {
      await providers_manager.save_file_refactoring_tool_config(config)
    } else {
      await providers_manager.save_commit_messages_tool_config(config)
    }
  }

  const current_config = get_tool_config()

  if (!current_config) {
    await setup_new_config()
  } else {
    await update_existing_config(current_config)
  }

  async function setup_new_config() {
    // Step 1: Select provider
    const provider_info = await select_provider()
    if (!provider_info) return // User cancelled

    // Step 2: Select model
    const model = await select_model()
    if (!model) return // User cancelled

    // Step 3: Set temperature
    const temperature = await set_temperature()
    if (temperature === undefined) return // User cancelled

    // Save the complete configuration
    const config: ToolConfig = {
      provider_type: provider_info.type,
      provider_name: provider_info.name,
      model,
      temperature
    }

    await save_tool_config(config)
    vscode.window.showInformationMessage(
      `${tool} tool configuration completed successfully.`
    )
  }

  // Function to update existing configuration
  async function update_existing_config(config: ToolConfig) {
    const show_config_options = async () => {
      const options = [
        { label: 'Provider', description: config.provider_name },
        { label: 'Model', description: config.model },
        {
          label: 'Temperature',
          description: `${
            config.temperature !== undefined ? config.temperature : 'Not set'
          }`
        }
      ]

      const selection = await vscode.window.showQuickPick(options, {
        title: `Update ${tool} Configuration`,
        placeHolder: 'Select setting to update'
      })

      if (!selection) return // User cancelled

      let updated = false

      if (selection.label == 'Provider') {
        const provider_info = await select_provider()
        if (!provider_info) return // User cancelled

        // If provider changed, model selection is mandatory
        const model = await select_model()
        if (!model) return // User cancelled

        config = {
          ...config,
          provider_type: provider_info.type,
          provider_name: provider_info.name,
          model
        }
        updated = true
      } else if (selection.label == 'Model') {
        const new_model = await select_model()
        if (!new_model) return // User cancelled
        config.model = new_model
        updated = true
      } else if (selection.label == 'Temperature') {
        const new_temperature = await set_temperature()
        if (new_temperature === undefined) return // User cancelled
        config.temperature = new_temperature
        updated = true
      }

      if (updated) {
        await save_tool_config(config)
        vscode.window.showInformationMessage(
          `${tool} configuration updated successfully.`
        )
      }

      // Show the options again after updating
      await show_config_options()
    }

    // Start the configuration loop
    await show_config_options()
  }

  // Helper function to select a provider
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

  async function select_model(): Promise<string | undefined> {
    const model_items = [
      { label: 'gpt-4' },
      { label: 'gpt-3.5-turbo' },
      { label: 'claude-3-opus' }
    ]

    const selected = await vscode.window.showQuickPick(model_items, {
      title: 'Select Model',
      placeHolder: 'Choose an AI model'
    })

    return selected?.label
  }

  async function set_temperature(): Promise<number | undefined> {
    const temperature_input = await vscode.window.showInputBox({
      title: 'Set Temperature',
      prompt: 'Enter a value between 0 and 1',
      placeHolder: '',
      validateInput: (value) => {
        const num = Number(value)
        if (isNaN(num)) return 'Please enter a valid number'
        if (num < 0 || num > 1) return 'Temperature must be between 0 and 1'
        return null
      }
    })

    if (temperature_input === undefined) return undefined

    return Number(temperature_input)
  }
}

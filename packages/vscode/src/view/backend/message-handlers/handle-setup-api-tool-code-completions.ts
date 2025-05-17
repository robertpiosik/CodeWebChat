import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import {
  ApiProvidersManager,
  Provider,
  ToolConfig
} from '@/services/api-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'

export const handle_setup_api_tool_code_completions = async (
  provider: ViewProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()
  const default_temperature = 0.2

  // Use let because current_configs will be updated when items are deleted or reordered
  let current_configs = providers_manager.get_code_completions_tool_config()

  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: 'Delete configuration'
  }

  const move_up_button = {
    iconPath: new vscode.ThemeIcon('chevron-up'),
    tooltip: 'Move up'
  }

  const move_down_button = {
    iconPath: new vscode.ThemeIcon('chevron-down'),
    tooltip: 'Move down'
  }

  const create_config_items = () => {
    const items: (vscode.QuickPickItem & {
      config?: ToolConfig
      index?: number
    })[] = [
      {
        label: '$(add) Add new configuration...'
      }
    ]

    if (current_configs.length > 0) {
      items.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      })
      items.push(
        ...current_configs.map((config, index) => ({
          label: `$(edit) ${config.provider_name} / ${config.model}`,
          buttons: [move_up_button, move_down_button, delete_button],
          config,
          index
        }))
      )
    }

    return items
  }

  const show_configs_quick_pick = async (): Promise<void> => {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_config_items()
    quick_pick.title = 'Code Completions Configurations'
    quick_pick.placeholder =
      current_configs.length == 0
        ? 'No configurations set up. Add a new one.'
        : 'Select a configuration to edit or add a new one'

    return new Promise<void>((resolve) => {
      quick_pick.onDidAccept(async () => {
        const selected = quick_pick.selectedItems[0]
        if (!selected) {
          quick_pick.hide()
          resolve()
          return
        }

        if (selected.label == '$(add) Add new configuration...') {
          quick_pick.hide()
          await add_configuration()
          // After adding, show the quick pick again
          await show_configs_quick_pick()
        } else if ('config' in selected && selected.config) {
          quick_pick.hide()
          // Start the recursive edit flow
          await edit_configuration(selected.config as ToolConfig)
          // After editing flow finishes (user selected back), show the main quick pick again
          await show_configs_quick_pick()
        }
      })

      quick_pick.onDidTriggerItemButton(async (event) => {
        const item = event.item as vscode.QuickPickItem & {
          config: ToolConfig
          index: number
        }

        if (event.button === delete_button) {
          const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete "${item.config.provider_name} / ${item.config.model}"?`,
            { modal: true },
            'Delete'
          )

          if (confirm == 'Delete') {
            // Update the local array reference
            current_configs.splice(item.index, 1)
            await providers_manager.save_code_completions_tool_config(
              current_configs
            )
            vscode.window.showInformationMessage(
              `Removed configuration: ${item.config.provider_name} / ${item.config.model}`
            )
            // Refresh the items in the quick pick
            quick_pick.items = create_config_items()

            if (current_configs.length == 0) {
              quick_pick.placeholder =
                'No configurations set up. Add a new one.'
            }
            // Keep the quick pick open
            quick_pick.show()
          }
        } else if (
          event.button === move_up_button ||
          event.button === move_down_button
        ) {
          const current_index = item.index
          const is_moving_up = event.button === move_up_button

          // Calculate new index based on direction
          const min_index = 0
          const max_index = current_configs.length - 1
          const new_index = is_moving_up
            ? Math.max(min_index, current_index - 1)
            : Math.min(max_index, current_index + 1)

          // Don't do anything if already at the boundary
          if (new_index == current_index) {
            return
          }

          // Create a new array with reordered configs
          const reordered_configs = [...current_configs]

          // Remove the config from the current position
          const [moved_config] = reordered_configs.splice(current_index, 1)

          // Insert the config at the new position
          reordered_configs.splice(new_index, 0, moved_config)

          // Update the local array reference
          current_configs = reordered_configs

          // Save the reordered configs
          await providers_manager.save_code_completions_tool_config(
            current_configs
          )

          // Update quick pick items to reflect the new order
          quick_pick.items = create_config_items()
        }
      })

      quick_pick.onDidHide(() => {
        resolve()
      })

      quick_pick.show()
    })
  }

  async function add_configuration() {
    // Step 1: Select provider
    const provider_info = await select_provider()
    if (!provider_info) {
      return // User cancelled, return to main quick pick
    }

    // Step 2: Select model
    const model = await select_model(provider_info)
    if (!model) {
      return // User cancelled, return to main quick pick
    }

    // Check if this provider/model combination already exists
    const provider_model_exists = current_configs.some(
      (config) =>
        config.provider_type == provider_info.type &&
        config.provider_name == provider_info.name &&
        config.model == model
    )

    if (provider_model_exists) {
      vscode.window.showErrorMessage(
        `A configuration for ${provider_info.name} / ${model} already exists.`
      )
      return // Return to main quick pick
    }

    const new_config: ToolConfig = {
      provider_type: provider_info.type,
      provider_name: provider_info.name,
      model,
      temperature: default_temperature
    }

    // Update the local array reference
    current_configs.push(new_config)
    await providers_manager.save_code_completions_tool_config(current_configs)
    vscode.window.showInformationMessage(
      `Added configuration: ${provider_info.name} / ${model}`
    )
  }

  async function edit_configuration(config: ToolConfig) {
    const back_label = '$(arrow-left) Back'

    // Show edit options: provider, model, or temperature
    const edit_options = [
      { label: back_label },
      { label: '', kind: vscode.QuickPickItemKind.Separator },
      { label: '$(edit) Provider', description: config.provider_name },
      { label: '$(edit) Model', description: config.model },
      {
        label: '$(edit) Temperature',
        description: config.temperature.toString()
      }
    ]

    const selected_option = await vscode.window.showQuickPick(edit_options, {
      title: `Edit Configuration: ${config.provider_name} / ${config.model}`,
      placeHolder: 'Select what to update'
    })

    if (!selected_option || selected_option.label === back_label) {
      // User cancelled or chose back, exit the recursive edit flow
      return // This return goes back to the show_configs_quick_pick loop
    }

    // Store original config state for comparison and finding in array
    const original_config_state = { ...config }
    const updated_config_state = { ...config }
    let config_changed_in_this_step = false // Did the user select an option that resulted in a potential change?

    // Handle option based on selection
    if (selected_option.label == '$(edit) Provider') {
      const new_provider = await select_provider()
      if (!new_provider) {
        // User cancelled provider selection, re-show edit menu with current config state
        await edit_configuration(config)
        return
      }

      updated_config_state.provider_type = new_provider.type
      updated_config_state.provider_name = new_provider.name
      config_changed_in_this_step = true

      // If provider changes, model must also be selected
      const new_model = await select_model(new_provider)
      if (!new_model) {
        // User cancelled model selection after provider, re-show edit menu with current config state
        await edit_configuration(config)
        return
      }

      updated_config_state.model = new_model
      // config_changed_in_this_step remains true
    } else if (selected_option.label == '$(edit) Model') {
      const provider_info = {
        type: config.provider_type,
        name: config.provider_name
      }

      const new_model = await select_model(
        provider_info as Pick<Provider, 'type' | 'name'>
      )
      if (!new_model) {
        // User cancelled model selection, re-show edit menu with current config state
        await edit_configuration(config)
        return
      }

      updated_config_state.model = new_model
      config_changed_in_this_step = true
    } else if (selected_option.label == '$(edit) Temperature') {
      const new_temperature = await set_temperature(config.temperature)
      if (new_temperature === undefined) {
        // User cancelled temperature input, re-show edit menu with current config state
        await edit_configuration(config)
        return
      }

      // Only mark as changed if the value is actually different
      if (new_temperature !== config.temperature) {
        updated_config_state.temperature = new_temperature
        config_changed_in_this_step = true
      } else {
        // Value didn't change, just re-show the edit menu with current config state
        await edit_configuration(config)
        return
      }
    }

    // If any changes were made in this step (i.e., a field was selected and potentially updated)
    if (config_changed_in_this_step) {
      // Find the *original* config object in the current_configs array
      // to exclude it from the duplicate check.
      const original_config_in_array = current_configs.find(
        (c) =>
          c.provider_name === original_config_state.provider_name &&
          c.provider_type === original_config_state.provider_type &&
          c.model === original_config_state.model
      )

      const would_be_duplicate = current_configs.some(
        (c) =>
          c !== original_config_in_array && // Exclude the config we are currently editing
          c.provider_type == updated_config_state.provider_type &&
          c.provider_name == updated_config_state.provider_name &&
          c.model == updated_config_state.model
      )

      if (would_be_duplicate) {
        vscode.window.showErrorMessage(
          `A configuration for ${updated_config_state.provider_name} / ${updated_config_state.model} already exists.`
        )
        // Re-show the edit menu with the *original* config state for this edit session
        await edit_configuration(config)
        return
      }

      // Find and update the config in the local array
      // Find by original key fields in case provider/model changed
      const index = current_configs.findIndex(
        (c) =>
          c.provider_name == original_config_state.provider_name &&
          c.provider_type == original_config_state.provider_type &&
          c.model == original_config_state.model
      )

      if (index !== -1) {
        // Update the local array reference
        current_configs[index] = updated_config_state
        await providers_manager.save_code_completions_tool_config(
          current_configs
        )
        vscode.window.showInformationMessage('Configuration updated.')
      } else {
        // This case should ideally not happen if the original config was found
        // in the duplicate check, but good practice to handle.
        console.error('Could not find original config in array to update.')
        // Re-show edit menu with original config state
        await edit_configuration(config)
        return
      }
    }

    // After successfully handling the selected option (either updated and saved,
    // or value didn't change), re-show the edit configuration quick pick
    // with the potentially updated config state. This continues the edit loop.
    await edit_configuration(updated_config_state)
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
          ? PROVIDERS[provider.name]?.base_url // Use optional chaining
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
        return undefined
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
      return undefined
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
      // User cancelled or entered empty string
      return undefined
    }

    return Number(temperature_input)
  }

  // Start the configuration flow
  await show_configs_quick_pick()
}

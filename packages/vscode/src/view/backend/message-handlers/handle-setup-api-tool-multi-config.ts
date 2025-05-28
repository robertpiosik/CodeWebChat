import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import {
  ApiProvidersManager,
  Provider,
  ToolConfig,
  CodeCompletionsConfigs,
  FileRefactoringConfigs
} from '@/services/api-providers-manager'
import { ModelFetcher } from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'
import { Logger } from '@/helpers/logger'

type SupportedTool = 'code-completions' | 'refactoring'

const DEFAULT_TEMPERATURE: { [key in SupportedTool]: number } = {
  'code-completions': 0.2,
  'refactoring': 0.2
}

interface ToolMethods {
  get_configs: () => Promise<ToolConfig[]>
  save_configs: (configs: ToolConfig[]) => Promise<void>
  get_default_config: () => Promise<ToolConfig | undefined>
  set_default_config: (config: ToolConfig | null) => Promise<void>
  get_display_name: () => string
}

export const handle_setup_api_tool_multi_config = async (params: {
  provider: ViewProvider
  tool: SupportedTool
}): Promise<void> => {
  const providers_manager = new ApiProvidersManager(params.provider.context)
  const model_fetcher = new ModelFetcher()

  const get_tool_methods = (tool: SupportedTool): ToolMethods => {
    switch (tool) {
      case 'code-completions':
        return {
          get_configs: () =>
            providers_manager.get_code_completions_tool_configs(),
          save_configs: (configs: CodeCompletionsConfigs) =>
            providers_manager.save_code_completions_tool_configs(configs),
          get_default_config: () =>
            providers_manager.get_default_code_completions_config(),
          set_default_config: (config: ToolConfig | null) =>
            providers_manager.set_default_code_completions_config(
              config as any
            ),
          get_display_name: () => 'Code Completions'
        }
      case 'refactoring':
        return {
          get_configs: () =>
            providers_manager.get_file_refactoring_tool_configs(),
          save_configs: (configs: FileRefactoringConfigs) =>
            providers_manager.save_file_refactoring_tool_configs(configs),
          get_default_config: () =>
            providers_manager.get_default_file_refactoring_config(),
          set_default_config: (config: ToolConfig | null) =>
            providers_manager.set_default_file_refactoring_config(
              config as any
            ),
          get_display_name: () => 'Refactoring'
        }
      default:
        throw new Error(`Unsupported tool: ${tool}`)
    }
  }

  const tool_methods = get_tool_methods(params.tool)

  let current_configs = await tool_methods.get_configs()
  let default_config = await tool_methods.get_default_config()

  // UI button definitions
  const edit_button = {
    iconPath: new vscode.ThemeIcon('edit'),
    tooltip: 'Edit configuration'
  }

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

  const set_default_button = {
    iconPath: new vscode.ThemeIcon('star'),
    tooltip: 'Set as default'
  }

  const unset_default_button = {
    iconPath: new vscode.ThemeIcon('star-full'),
    tooltip: 'Unset default'
  }

  const create_config_items = () => {
    const items: (vscode.QuickPickItem & {
      config?: ToolConfig
      index?: number
    })[] = [
      {
        label: '$(add) Add another configuration...'
      }
    ]

    if (current_configs.length > 0) {
      items.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      })
      items.push(
        ...current_configs.map((config, index) => {
          const is_default =
            default_config &&
            default_config.provider_type == config.provider_type &&
            default_config.provider_name == config.provider_name &&
            default_config.model == config.model

          let buttons = []
          if (current_configs.length > 1) {
            const is_first_item = index == 0
            const is_last_item = index == current_configs.length - 1

            const navigation_buttons = []
            if (!is_first_item) {
              navigation_buttons.push(move_up_button)
            }
            if (!is_last_item) {
              navigation_buttons.push(move_down_button)
            }

            if (!is_default) {
              buttons = [
                ...navigation_buttons,
                set_default_button,
                edit_button,
                delete_button
              ]
            } else {
              buttons = [
                ...navigation_buttons,
                unset_default_button,
                edit_button,
                delete_button
              ]
            }
          } else {
            if (!is_default) {
              buttons = [set_default_button, edit_button, delete_button]
            } else {
              buttons = [unset_default_button, edit_button, delete_button]
            }
          }

          return {
            label: config.model,
            description: `${config.provider_name}${
              is_default ? ` • default configuration` : ''
            }`,
            buttons,
            config,
            index
          }
        })
      )
    }

    return items
  }

  const show_configs_quick_pick = async (): Promise<void> => {
    if (current_configs.length == 0) {
      await add_configuration()
      if (current_configs.length > 0) {
        return show_configs_quick_pick()
      }
      return
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_config_items()
    quick_pick.title = `${tool_methods.get_display_name()} Configurations`
    quick_pick.placeholder = 'Select a configuration to edit or add another one'

    return new Promise<void>((resolve) => {
      quick_pick.onDidAccept(async () => {
        const selected = quick_pick.selectedItems[0]
        if (!selected) {
          quick_pick.hide()
          resolve()
          return
        }

        if (selected.label == '$(add) Add another configuration...') {
          quick_pick.hide()
          await add_configuration()
          await show_configs_quick_pick()
        } else if ('config' in selected && selected.config) {
          quick_pick.hide()
          await edit_configuration(selected.config as ToolConfig)
          await show_configs_quick_pick()
        }
      })

      quick_pick.onDidTriggerItemButton(async (event) => {
        const item = event.item as vscode.QuickPickItem & {
          config: ToolConfig
          index: number
        }

        if (event.button === edit_button) {
          quick_pick.hide()
          await edit_configuration(item.config)
          await show_configs_quick_pick()
        } else if (event.button === delete_button) {
          const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete ${item.config.model} (${item.config.provider_name})?`,
            { modal: true },
            'Delete'
          )

          if (confirm == 'Delete') {
            current_configs.splice(item.index, 1)
            await tool_methods.save_configs(current_configs)

            if (
              default_config &&
              default_config.provider_type == item.config.provider_type &&
              default_config.provider_name == item.config.provider_name &&
              default_config.model == item.config.model
            ) {
              default_config = undefined
              await tool_methods.set_default_config(null)
            }

            if (current_configs.length == 0) {
              quick_pick.hide()
              await add_configuration()
              if (current_configs.length > 0) {
                await show_configs_quick_pick()
              }
            } else {
              quick_pick.items = create_config_items()
              quick_pick.show()
            }
          }
        } else if (
          event.button === move_up_button ||
          event.button === move_down_button
        ) {
          const current_index = item.index
          const is_moving_up = event.button === move_up_button

          const min_index = 0
          const max_index = current_configs.length - 1
          const new_index = is_moving_up
            ? Math.max(min_index, current_index - 1)
            : Math.min(max_index, current_index + 1)

          if (new_index == current_index) {
            return
          }

          const reordered_configs = [...current_configs]
          const [moved_config] = reordered_configs.splice(current_index, 1)
          reordered_configs.splice(new_index, 0, moved_config)
          current_configs = reordered_configs
          await tool_methods.save_configs(current_configs)

          quick_pick.items = create_config_items()
        } else if (event.button === set_default_button) {
          default_config = { ...item.config }
          await tool_methods.set_default_config(default_config)
          quick_pick.items = create_config_items()
        } else if (event.button === unset_default_button) {
          default_config = undefined
          await tool_methods.set_default_config(null)
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
    const provider_info = await select_provider()
    if (!provider_info) {
      return
    }

    const model = await select_model(provider_info)
    if (!model) {
      return
    }

    const provider_model_exists = current_configs.some(
      (config) =>
        config.provider_type == provider_info.type &&
        config.provider_name == provider_info.name &&
        config.model == model
    )

    if (provider_model_exists) {
      vscode.window.showErrorMessage(
        `A configuration for ${model} (${provider_info.name}) already exists.`
      )
      return
    }

    const new_config: ToolConfig = {
      provider_type: provider_info.type,
      provider_name: provider_info.name,
      model,
      temperature: DEFAULT_TEMPERATURE[params.tool]
    }

    current_configs.push(new_config)
    await tool_methods.save_configs(current_configs)
    await edit_configuration(new_config)
  }

  async function edit_configuration(config: ToolConfig) {
    const back_label = '$(arrow-left) Back'
    const set_as_default_label = '$(star) Set as default'
    const unset_default_label = '$(star-full) Unset default'

    const create_edit_options = () => {
      const options = [
        { label: back_label },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
          label: `Provider`,
          description: config.provider_name
        },
        { label: `Model`, description: config.model },
        {
          label: `Temperature`,
          description: config.temperature.toString()
        }
      ]

      const current_is_default =
        default_config &&
        default_config.provider_type == config.provider_type &&
        default_config.provider_name == config.provider_name &&
        default_config.model == config.model

      if (current_is_default) {
        options.push({
          label: unset_default_label
        })
      } else {
        options.push({
          label: set_as_default_label
        })
      }

      return options
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_edit_options()
    quick_pick.title = `Edit Configuration: ${config.provider_name} / ${config.model}`
    quick_pick.placeholder = 'Select what to update'

    return new Promise<void>((resolve) => {
      quick_pick.onDidAccept(async () => {
        const selected_option = quick_pick.selectedItems[0]
        if (!selected_option || selected_option.label == back_label) {
          quick_pick.hide()
          resolve()
          return
        }

        if (selected_option.label == set_as_default_label) {
          default_config = { ...config }
          await tool_methods.set_default_config(default_config)
          quick_pick.items = create_edit_options()
          return
        }

        if (selected_option.label == unset_default_label) {
          default_config = undefined
          await tool_methods.set_default_config(null)
          quick_pick.items = create_edit_options()
          return
        }

        quick_pick.hide()

        const original_config_state = { ...config }
        const updated_config_state = { ...config }
        let config_changed_in_this_step = false

        if (selected_option.label.startsWith('Provider')) {
          const new_provider = await select_provider()
          if (!new_provider) {
            await edit_configuration(config)
            resolve()
            return
          }

          const new_model = await select_model(new_provider)
          if (!new_model) {
            await edit_configuration(config)
            resolve()
            return
          }

          if (
            new_provider.type != config.provider_type ||
            new_provider.name != config.provider_name ||
            new_model != config.model
          ) {
            updated_config_state.provider_type = new_provider.type
            updated_config_state.provider_name = new_provider.name
            updated_config_state.model = new_model
            config_changed_in_this_step = true
          } else {
            await edit_configuration(config)
            resolve()
            return
          }
        } else if (selected_option.label.startsWith('Model')) {
          const provider_info = {
            type: config.provider_type,
            name: config.provider_name
          }

          const new_model = await select_model(
            provider_info as Pick<Provider, 'type' | 'name'>
          )
          if (!new_model) {
            await edit_configuration(config)
            resolve()
            return
          }

          if (new_model != config.model) {
            updated_config_state.model = new_model
            config_changed_in_this_step = true
          } else {
            await edit_configuration(config)
            resolve()
            return
          }
        } else if (selected_option.label.startsWith('Temperature')) {
          const new_temperature = await set_temperature(config.temperature)
          if (new_temperature === undefined) {
            await edit_configuration(config)
            resolve()
            return
          }

          if (new_temperature != config.temperature) {
            updated_config_state.temperature = new_temperature
            config_changed_in_this_step = true
          } else {
            await edit_configuration(config)
            resolve()
            return
          }
        } else {
          await edit_configuration(config)
          resolve()
          return
        }

        if (config_changed_in_this_step) {
          const original_config_in_array = current_configs.find(
            (c) =>
              c.provider_name == original_config_state.provider_name &&
              c.provider_type == original_config_state.provider_type &&
              c.model == original_config_state.model
          )

          const would_be_duplicate = current_configs.some(
            (c) =>
              c !== original_config_in_array &&
              c.provider_type == updated_config_state.provider_type &&
              c.provider_name == updated_config_state.provider_name &&
              c.model == updated_config_state.model
          )

          if (would_be_duplicate) {
            vscode.window.showErrorMessage(
              `A configuration for ${updated_config_state.model} provided by ${updated_config_state.provider_name} already exists.`
            )
            await edit_configuration(config)
            resolve()
            return
          }

          const index = current_configs.findIndex(
            (c) =>
              c.provider_name == original_config_state.provider_name &&
              c.provider_type == original_config_state.provider_type &&
              c.model == original_config_state.model
          )

          if (index != -1) {
            current_configs[index] = updated_config_state
            await tool_methods.save_configs(current_configs)

            if (
              default_config &&
              default_config.provider_type ==
                original_config_state.provider_type &&
              default_config.provider_name ==
                original_config_state.provider_name &&
              default_config.model == original_config_state.model
            ) {
              default_config = updated_config_state
              await tool_methods.set_default_config(updated_config_state)
            }
          } else {
            console.error('Could not find original config in array to update.')
            resolve()
            return
          }
        }

        await edit_configuration(updated_config_state)
        resolve()
      })

      quick_pick.onDidHide(() => {
        resolve()
      })

      quick_pick.show()
    })
  }

  async function select_provider(): Promise<
    Pick<Provider, 'type' | 'name'> | undefined
  > {
    const providers = await providers_manager.get_providers()

    if (providers.length == 0) {
      vscode.window.showErrorMessage(
        'No API providers found. Please configure an API provider first.'
      )
      return undefined
    }

    const provider_items = providers.map((p) => ({
      label: p.name,
      description: p.type == 'built-in' ? 'Predefined' : 'Custom',
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
      const provider = await providers_manager.get_provider(provider_info.name)
      if (!provider) {
        throw new Error(`Provider ${provider_info.name} not found`)
      }

      const base_url =
        provider.type == 'built-in'
          ? PROVIDERS[provider.name]?.base_url
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

      return selected?.description || selected?.label
    } catch (error) {
      Logger.error({
        function_name: 'select_model',
        message: 'Failed to fetch models',
        data: error
      })
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
      return undefined
    }

    return Number(temperature_input)
  }

  await show_configs_quick_pick()
}

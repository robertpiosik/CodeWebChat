import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { EditCodeCompletionsConfigurationMessage } from '@/views/settings/types/messages'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_model_for_config,
  edit_provider_for_config,
  edit_reasoning_effort_for_config,
  edit_temperature_for_config,
  initial_select_model,
  initial_select_provider
} from '../../utils/config-editing'

export const handle_upsert_code_completions_configuration = async (
  provider: SettingsProvider,
  message?: EditCodeCompletionsConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()
  const configs = await providers_manager.get_code_completions_tool_configs()

  let config_to_edit: ToolConfig
  let original_id: string | undefined

  if (message?.configuration_id) {
    // Edit mode
    const config_index = configs.findIndex(
      (c) => get_tool_config_id(c) === message.configuration_id
    )

    if (config_index === -1) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_NOT_FOUND
      )
      return
    }

    config_to_edit = { ...configs[config_index] }
    original_id = message.configuration_id
  } else {
    // Add mode
    const selected_provider = await initial_select_provider(providers_manager)
    if (!selected_provider) return

    const selected_model = await initial_select_model(
      model_fetcher,
      selected_provider
    )
    if (!selected_model) return

    config_to_edit = {
      provider_type: selected_provider.type,
      provider_name: selected_provider.name,
      model: selected_model,
      temperature: undefined
    }
  }

  const updated_config = config_to_edit

  // Editing loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const items: vscode.QuickPickItem[] = [
      { label: 'Provider', detail: updated_config.provider_name },
      { label: 'Model', detail: updated_config.model },
      { label: 'Advanced', detail: 'Temperature, Reasoning Effort...' }
    ]

    const selected_item = await vscode.window.showQuickPick(items, {
      title: original_id ? 'Edit Configuration' : 'Create New Configuration',
      placeHolder: 'Select a property to edit, or press Esc to save'
    })

    if (!selected_item) {
      break
    }

    const selected_option = selected_item.label

    if (selected_option === 'Provider') {
      const new_provider = await edit_provider_for_config(providers_manager)
      if (new_provider) {
        updated_config.provider_name = new_provider.provider_name
        updated_config.provider_type = new_provider.provider_type
      }
    } else if (selected_option === 'Model') {
      const new_model = await edit_model_for_config(
        updated_config,
        providers_manager,
        model_fetcher
      )
      if (new_model !== undefined) {
        updated_config.model = new_model
      }
    } else if (selected_option === 'Advanced') {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const advanced_items: vscode.QuickPickItem[] = [
          {
            label: 'Temperature',
            detail: updated_config.temperature?.toString()
          },
          {
            label: 'Reasoning Effort',
            description: 'Requires supporting model',
            detail: updated_config.reasoning_effort
          }
        ]
        const selected_advanced = await new Promise<
          vscode.QuickPickItem | undefined
        >((resolve) => {
          const quick_pick = vscode.window.createQuickPick()
          quick_pick.items = advanced_items
          quick_pick.title = original_id
            ? 'Edit Configuration - Advanced'
            : 'Create New Configuration - Advanced'
          quick_pick.placeholder = 'Select a property to edit'
          quick_pick.buttons = [vscode.QuickInputButtons.Back]
          let accepted = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            quick_pick.onDidAccept(() => {
              accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            }),
            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                quick_pick.hide()
              }
            }),
            quick_pick.onDidHide(() => {
              if (!accepted) resolve(undefined)
              disposables.forEach((d) => d.dispose())
              quick_pick.dispose()
            })
          )
          quick_pick.show()
        })

        if (!selected_advanced) break

        if (selected_advanced.label === 'Temperature') {
          const new_temp = await edit_temperature_for_config(updated_config)
          if (new_temp !== undefined) {
            updated_config.temperature =
              new_temp === null ? undefined : new_temp
          }
        } else if (selected_advanced.label === 'Reasoning Effort') {
          const new_effort = await edit_reasoning_effort_for_config()
          if (new_effort !== undefined) {
            updated_config.reasoning_effort =
              new_effort === null ? undefined : (new_effort as any)
          }
        }
      }
    }
  }

  // Save logic
  const new_id = get_tool_config_id(updated_config)

  if (original_id) {
    // If nothing changed, return
    const original_config = configs.find(
      (c) => get_tool_config_id(c) === original_id
    )
    if (JSON.stringify(original_config) === JSON.stringify(updated_config)) {
      return
    }

    // Check for collision with OTHER configs
    if (
      new_id !== original_id &&
      configs.some((c) => get_tool_config_id(c) === new_id)
    ) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
      )
      return
    }

    const index = configs.findIndex(
      (c) => get_tool_config_id(c) === original_id
    )
    if (index !== -1) {
      configs[index] = updated_config
    }
  } else {
    // Add mode: check for collision
    if (configs.some((c) => get_tool_config_id(c) === new_id)) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
      )
      return
    }
    configs.push(updated_config)
  }

  await providers_manager.save_code_completions_tool_configs(configs)
}

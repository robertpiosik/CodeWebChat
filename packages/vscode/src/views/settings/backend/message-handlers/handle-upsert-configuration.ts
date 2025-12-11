import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id,
  Provider
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { UpsertConfigurationMessage } from '@/views/settings/types/messages'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_instructions_placement_for_config,
  edit_max_concurrency_for_config,
  edit_model_for_config,
  edit_provider_for_config,
  edit_reasoning_effort_for_config,
  edit_temperature_for_config,
  initial_select_model,
  initial_select_provider
} from '../../utils/config-editing'

export const handle_upsert_configuration = async (
  provider: SettingsProvider,
  message: UpsertConfigurationMessage
): Promise<void> => {
  const { tool_type, configuration_id } = message
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_fetcher = new ModelFetcher()

  let get_configs: () => Promise<ToolConfig[]>
  let save_configs: (configs: ToolConfig[]) => Promise<void>
  let advanced_options: string[] = []
  let advanced_details = ''

  switch (tool_type) {
    case 'code-completions':
      get_configs = () => providers_manager.get_code_completions_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_code_completions_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort']
      advanced_details = 'Temperature, Reasoning Effort...'
      break
    case 'commit-messages':
      get_configs = () => providers_manager.get_commit_messages_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_commit_messages_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort']
      advanced_details = 'Temperature, Reasoning Effort...'
      break
    case 'edit-context':
      get_configs = () => providers_manager.get_edit_context_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_edit_context_tool_configs(configs)
      advanced_options = [
        'Temperature',
        'Reasoning Effort',
        'Instructions Placement'
      ]
      advanced_details =
        'Temperature, Reasoning Effort, Instructions Placement...'
      break
    case 'intelligent-update':
      get_configs = () =>
        providers_manager.get_intelligent_update_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_intelligent_update_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort', 'Max Concurrency']
      advanced_details = 'Temperature, Reasoning Effort, Max Concurrency...'
      break
  }

  const configs = await get_configs()

  let config_to_edit: ToolConfig
  let original_id: string | undefined

  if (configuration_id) {
    // Edit mode
    const config_index = configs.findIndex(
      (c) => get_tool_config_id(c) == configuration_id
    )

    if (config_index === -1) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_NOT_FOUND
      )
      return
    }

    config_to_edit = { ...configs[config_index] }
    original_id = configuration_id
  } else {
    // Add mode
    let selected_provider: Provider | undefined
    let selected_model: string | undefined

    // eslint-disable-next-line no-constant-condition
    while (true) {
      selected_provider = await initial_select_provider(providers_manager)
      if (!selected_provider) return

      selected_model = await initial_select_model(
        model_fetcher,
        selected_provider
      )
      if (selected_model) break
    }

    config_to_edit = {
      provider_type: selected_provider!.type,
      provider_name: selected_provider!.name,
      model: selected_model,
      temperature: undefined
    }
  }

  const updated_config = config_to_edit
  const starting_config = { ...updated_config }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const has_changes =
      JSON.stringify(updated_config) !== JSON.stringify(starting_config)

    const items: vscode.QuickPickItem[] = [
      { label: 'Model Provider', detail: updated_config.provider_name },
      { label: 'Model', detail: updated_config.model },
      { label: 'Advanced', detail: advanced_details }
    ]

    const selected_item = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = items
        quick_pick.title = original_id
          ? 'Edit Configuration'
          : 'Create New Configuration'
        quick_pick.placeholder =
          'Select a property to edit, or press Esc to save'
        const close_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Save and Close'
        }
        const redo_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('redo'),
          tooltip: 'Reset Changes'
        }
        quick_pick.buttons = has_changes
          ? [redo_button, close_button]
          : [close_button]
        let accepted = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidAccept(() => {
            accepted = true
            resolve(quick_pick.selectedItems[0])
            quick_pick.hide()
          }),
          quick_pick.onDidTriggerButton((button) => {
            if (button === close_button) {
              quick_pick.hide()
            } else if (button === redo_button) {
              Object.keys(updated_config).forEach(
                (key) => delete (updated_config as any)[key]
              )
              Object.assign(updated_config, starting_config)
              quick_pick.items = [
                {
                  label: 'Model Provider',
                  detail: updated_config.provider_name
                },
                { label: 'Model', detail: updated_config.model },
                { label: 'Advanced', detail: advanced_details }
              ]
              quick_pick.buttons = [close_button]
            }
          }),
          quick_pick.onDidHide(() => {
            if (!accepted) resolve(undefined)
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          })
        )
        quick_pick.show()
      }
    )

    if (!selected_item) {
      break
    }

    const selected_option = selected_item.label

    if (selected_option === 'Model Provider') {
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
        const advanced_items: vscode.QuickPickItem[] = []
        if (advanced_options.includes('Temperature')) {
          advanced_items.push({
            label: 'Temperature',
            detail: updated_config.temperature?.toString()
          })
        }
        if (advanced_options.includes('Reasoning Effort')) {
          advanced_items.push({
            label: 'Reasoning Effort',
            description: 'Requires supporting model',
            detail: updated_config.reasoning_effort
          })
        }
        if (advanced_options.includes('Instructions Placement')) {
          advanced_items.push({
            label: 'Instructions Placement',
            detail:
              (updated_config.instructions_placement ?? 'above-and-below') ===
              'below-only'
                ? 'Below Only'
                : 'Above and Below'
          })
        }
        if (advanced_options.includes('Max Concurrency')) {
          advanced_items.push({
            label: 'Max Concurrency',
            detail: `${updated_config.max_concurrency ?? 1}`
          })
        }

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
        } else if (selected_advanced.label === 'Instructions Placement') {
          const new_placement = await edit_instructions_placement_for_config()
          if (new_placement !== undefined) {
            updated_config.instructions_placement = new_placement as any
          }
        } else if (selected_advanced.label === 'Max Concurrency') {
          const new_concurrency =
            await edit_max_concurrency_for_config(updated_config)
          if (new_concurrency !== undefined) {
            updated_config.max_concurrency = new_concurrency as any
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

  await save_configs(configs)
}

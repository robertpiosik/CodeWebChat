import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id,
  Provider
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_max_concurrency_for_config,
  edit_model_for_config,
  edit_provider_for_config,
  edit_reasoning_effort_for_config,
  edit_temperature_for_config,
  initial_select_model,
  initial_select_provider
} from './config-editing'
import axios from 'axios'
import { PROVIDERS } from '@shared/constants/providers'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'

export const upsert_configuration = async (params: {
  context: vscode.ExtensionContext
  tool_type: string
  configuration_id?: string
  create_on_top?: boolean
  insertion_index?: number
}): Promise<void> => {
  const providers_manager = new ModelProvidersManager(params.context)
  const model_fetcher = new ModelFetcher()

  let get_configs: () => Promise<ToolConfig[]>
  let save_configs: (configs: ToolConfig[]) => Promise<void>
  let advanced_options: string[] = []

  switch (params.tool_type) {
    case 'code-at-cursor':
      get_configs = () => providers_manager.get_code_completions_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_code_completions_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort']
      break
    case 'commit-messages':
      get_configs = () => providers_manager.get_commit_messages_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_commit_messages_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort']
      break
    case 'edit-context':
      get_configs = () => providers_manager.get_edit_context_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_edit_context_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort']
      break
    case 'intelligent-update':
      get_configs = () =>
        providers_manager.get_intelligent_update_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_intelligent_update_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort', 'Max Concurrency']
      break
    case 'prune-context':
      get_configs = () => providers_manager.get_prune_context_tool_configs()
      save_configs = (configs) =>
        providers_manager.save_prune_context_tool_configs(configs)
      advanced_options = ['Temperature', 'Reasoning Effort']
      break
    default:
      throw new Error(`Unknown tool type: ${params.tool_type}`)
  }

  const configs = await get_configs()

  let actual_insertion_index: number | undefined

  if (params.insertion_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          { label: 'Insert new configuration above' },
          { label: 'Insert new configuration below' }
        ]
        quick_pick.title = 'Placement'
        quick_pick.placeholder = 'Where to insert?'
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: 'Close'
          }
        ]

        let accepted = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidTriggerButton(() => {
            quick_pick.hide()
          }),
          quick_pick.onDidAccept(() => {
            accepted = true
            resolve(quick_pick.selectedItems[0]?.label)
            quick_pick.hide()
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
    if (!position_quick_pick) return

    actual_insertion_index =
      position_quick_pick == 'Insert new configuration above'
        ? params.insertion_index
        : params.insertion_index + 1
  }

  let config_to_edit: ToolConfig
  let original_id: string | undefined

  if (params.configuration_id) {
    // Edit mode
    const config_index = configs.findIndex(
      (c) => get_tool_config_id(c) == params.configuration_id
    )

    if (config_index == -1) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_NOT_FOUND
      )
      return
    }

    config_to_edit = { ...configs[config_index] }
    original_id = params.configuration_id
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
      { label: 'Advanced' }
    ]

    const selected_item = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = items
        quick_pick.title = original_id
          ? 'Edit Configuration'
          : 'Create New Configuration'
        quick_pick.placeholder = 'Select a property to edit'
        const close_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Save and close'
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
                { label: 'Advanced' }
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

    if (selected_option == 'Model Provider') {
      const new_provider = await edit_provider_for_config(providers_manager)
      if (new_provider) {
        updated_config.provider_name = new_provider.provider_name
        updated_config.provider_type = new_provider.provider_type
      }
    } else if (selected_option == 'Model') {
      const new_model = await edit_model_for_config(
        updated_config,
        providers_manager,
        model_fetcher
      )
      if (new_model !== undefined) {
        updated_config.model = new_model
      }
    } else if (selected_option == 'Advanced') {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const advanced_items: vscode.QuickPickItem[] = []
        if (advanced_options.includes('Temperature')) {
          advanced_items.push({
            label: 'Temperature',
            description: 'Leave empty with reasoning models',
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
        if (advanced_options.includes('Max Concurrency')) {
          advanced_items.push({
            label: 'Max Concurrency',
            description: !updated_config.max_concurrency ? 'Unset' : undefined,
            detail: updated_config.max_concurrency?.toString() || undefined
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

        if (selected_advanced.label == 'Temperature') {
          const new_temp = await edit_temperature_for_config(updated_config)
          if (new_temp !== undefined) {
            updated_config.temperature =
              new_temp === null ? undefined : new_temp
          }
        } else if (selected_advanced.label == 'Reasoning Effort') {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const new_effort = await edit_reasoning_effort_for_config()
            if (new_effort === undefined) break

            let is_valid = true
            if (new_effort !== null) {
              const provider = await providers_manager.get_provider(
                updated_config.provider_name
              )
              if (provider) {
                const base_url =
                  provider.type === 'built-in'
                    ? PROVIDERS[provider.name as keyof typeof PROVIDERS]
                        ?.base_url
                    : provider.base_url

                if (base_url) {
                  try {
                    await vscode.window.withProgress(
                      {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Checking reasoning effort support...',
                        cancellable: true
                      },
                      async (_progress, token) => {
                        await verify_reasoning_effort({
                          endpoint_url: base_url!,
                          api_key: provider.api_key,
                          model: updated_config.model,
                          reasoning_effort: new_effort as string,
                          provider,
                          cancellation_token: token
                        })
                      }
                    )
                  } catch (error: any) {
                    is_valid = false
                    if (error?.message != 'Cancelled') {
                      vscode.window.showWarningMessage(
                        dictionary.warning_message
                          .REASONING_EFFORT_NOT_SUPPORTED
                      )
                    }
                  }
                }
              }
            }

            if (is_valid) {
              updated_config.reasoning_effort =
                new_effort === null ? undefined : (new_effort as any)
              break
            }
          }
        } else if (selected_advanced.label == 'Max Concurrency') {
          const new_concurrency =
            await edit_max_concurrency_for_config(updated_config)
          if (new_concurrency !== undefined) {
            updated_config.max_concurrency =
              new_concurrency === null ? undefined : new_concurrency
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
    if (params.create_on_top) {
      configs.unshift(updated_config)
    } else if (actual_insertion_index !== undefined) {
      configs.splice(actual_insertion_index, 0, updated_config)
    } else {
      configs.push(updated_config)
    }
  }

  await save_configs(configs)
}

const verify_reasoning_effort = async (params: {
  endpoint_url: string
  api_key?: string
  model: string
  reasoning_effort: string
  provider: Provider
  cancellation_token: vscode.CancellationToken
}): Promise<void> => {
  const cancel_source = axios.CancelToken.source()

  const disposable = params.cancellation_token.onCancellationRequested(() => {
    cancel_source.cancel('User cancelled')
  })

  const body: any = {
    model: params.model,
    messages: [
      {
        role: 'user',
        content: 'Respond with "Hello!" and nothing else.'
      }
    ],
    stream: true
  }

  apply_reasoning_effort(body, params.provider, params.reasoning_effort as any)

  try {
    const response = await axios.post(
      params.endpoint_url + '/chat/completions',
      body,
      {
        headers: {
          ...(params.api_key
            ? { ['Authorization']: `Bearer ${params.api_key}` }
            : {}),
          ['Content-Type']: 'application/json'
        },
        responseType: 'stream',
        cancelToken: cancel_source.token
      }
    )

    await new Promise<void>((resolve, reject) => {
      const stream = response.data

      stream.on('data', () => {
        cancel_source.cancel('Verified')
        resolve()
      })

      stream.on('error', (err: any) => {
        reject(err)
      })

      stream.on('end', () => {
        resolve()
      })
    })
  } catch (error) {
    if (axios.isCancel(error)) {
      if (error.message == 'Verified') {
        return
      }
      if (error.message == 'User cancelled') {
        throw new Error('Cancelled')
      }
    }
    throw error
  } finally {
    disposable.dispose()
  }
}

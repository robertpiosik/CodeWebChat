import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  ApiConfiguration,
  get_api_configuration_id,
  ModelProvider
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { ModelFetcher } from '@/services/model-fetcher'
import {
  edit_model_for_api_configuration,
  edit_provider_for_api_configuration,
  edit_reasoning_effort_for_api_config,
  edit_temperature_for_api_configuration,
  edit_system_instructions_override_for_api_configuration,
  initial_select_model,
  initial_select_model_provider
} from './interactions'
import axios from 'axios'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { ToolType } from '@/views/settings/types/tools'

export const upsert_api_configuration = async (params: {
  context: vscode.ExtensionContext
  tool_type: ToolType
  api_configuration_id?: string
  duplicate_from_id?: string
  create_on_top?: boolean
  insertion_index?: number
}): Promise<void> => {
  const providers_manager = new ModelProvidersManager(params.context)
  const model_fetcher = new ModelFetcher()

  let get_default_api_configuration: (() => Promise<ApiConfiguration | undefined>) | undefined
  let set_default_api_configuration:
    | ((api_configuration: ApiConfiguration | null) => Promise<void>)
    | undefined

  if (params.tool_type == 'code-at-cursor') {
    get_default_api_configuration = () =>
      providers_manager.get_default_code_completions_api_configuration()
    set_default_api_configuration = (c) =>
      providers_manager.set_default_code_completions_api_configuration(c)
  } else if (params.tool_type == 'commit-messages') {
    get_default_api_configuration = () =>
      providers_manager.get_default_commit_messages_api_configuration()
    set_default_api_configuration = (c) =>
      providers_manager.set_default_commit_messages_api_configuration(c)
  } else if (params.tool_type == 'intelligent-update') {
    get_default_api_configuration = () =>
      providers_manager.get_default_intelligent_update_api_configuration()
    set_default_api_configuration = (c) =>
      providers_manager.set_default_intelligent_update_api_configuration(c)
  } else if (params.tool_type == 'find-relevant-files') {
    get_default_api_configuration = () =>
      providers_manager.get_default_find_relevant_files_api_configuration()
    set_default_api_configuration = (c) =>
      providers_manager.set_default_find_relevant_files_api_configuration(c)
  } else if (params.tool_type == 'voice-input') {
    get_default_api_configuration = () =>
      providers_manager.get_default_voice_input_api_configuration()
    set_default_api_configuration = (c) =>
      providers_manager.set_default_voice_input_api_configuration(c)
  } else if (params.tool_type !== 'edit-context') {
    throw new Error(`Unknown tool type: ${params.tool_type}`)
  }

  const api_configurations = await providers_manager.get_api_configurations()

  let actual_insertion_index: number | undefined

  if (params.insertion_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          { label: 'Insert a new API configuration above' },
          { label: 'Insert a new API configuration below' }
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
      position_quick_pick == 'Insert a new API configuration above'
        ? params.insertion_index
        : params.insertion_index + 1
  }

  let api_configuration_to_edit: ApiConfiguration
  let original_id: string | undefined
  let was_default = false

  if (params.api_configuration_id || params.duplicate_from_id) {
    const target_id = params.api_configuration_id || params.duplicate_from_id
    const api_configuration_index = api_configurations.findIndex(
      (c) => get_api_configuration_id(c) == target_id
    )

    if (api_configuration_index == -1) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_NOT_FOUND
      )
      return
    }

    api_configuration_to_edit = { ...api_configurations[api_configuration_index] }
    if (params.api_configuration_id) {
      original_id = params.api_configuration_id
      if (get_default_api_configuration) {
        const def_config = await get_default_api_configuration()
        if (def_config && get_api_configuration_id(def_config) === original_id) {
          was_default = true
        }
      }
    } else if (params.duplicate_from_id) {
      actual_insertion_index = api_configuration_index + 1
    }
  } else {
    let selected_model_provider: ModelProvider | undefined
    let selected_model: string | undefined

    while (true) {
      selected_model_provider = await initial_select_model_provider(
        params.context,
        providers_manager,
        selected_model_provider?.name
      )
      if (!selected_model_provider) return

      selected_model = await initial_select_model(
        model_fetcher,
        selected_model_provider,
        params.tool_type
      )
      if (selected_model) break
    }

    api_configuration_to_edit = {
      model_provider_name: selected_model_provider!.name,
      model: selected_model,
      temperature: undefined
    }
  }

  const updated_api_configuration = api_configuration_to_edit
  const starting_api_configuration = { ...updated_api_configuration }
  let last_selected_label: string | undefined

  while (true) {
    const has_changes =
      JSON.stringify(updated_api_configuration) !== JSON.stringify(starting_api_configuration)

    const items: vscode.QuickPickItem[] = [
      {
        label: 'Model',
        description: updated_api_configuration.model_provider_name,
        detail: updated_api_configuration.model
      }
    ]

    const reasoning_effort_item: vscode.QuickPickItem = {
      label: 'Reasoning Effort',
      detail: updated_api_configuration.reasoning_effort
    }
    if (updated_api_configuration.reasoning_effort) {
      reasoning_effort_item.buttons = [
        { iconPath: new vscode.ThemeIcon('eraser'), tooltip: 'Unset' }
      ]
    }
    items.push(reasoning_effort_item)

    items.push({ label: 'Advanced...' })
    const selected_item = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = items
        quick_pick.title = original_id
          ? 'Edit API Configuration'
          : 'New API Configuration'
        quick_pick.placeholder = 'Select a property to edit'
        const close_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('save'),
          tooltip: 'Save and close'
        }
        const discard_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('discard'),
          tooltip: 'Discard changes'
        }
        quick_pick.buttons = has_changes
          ? [discard_button, close_button]
          : [close_button]
        if (last_selected_label) {
          const active = items.find((i) => i.label === last_selected_label)
          if (active) quick_pick.activeItems = [active]
        }
        let accepted = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidTriggerItemButton((e) => {
            if (e.item.label == 'Reasoning Effort') {
              delete updated_api_configuration.reasoning_effort
              accepted = true
              resolve({ label: 'REFRESH' })
              quick_pick.hide()
            }
          }),
          quick_pick.onDidAccept(() => {
            accepted = true
            resolve(quick_pick.selectedItems[0])
            quick_pick.hide()
          }),
          quick_pick.onDidTriggerButton((button) => {
            if (button === close_button) {
              quick_pick.hide()
            } else if (button === discard_button) {
              Object.keys(updated_api_configuration).forEach(
                (key) => delete (updated_api_configuration as any)[key]
              )
              Object.assign(updated_api_configuration, starting_api_configuration)

              const reset_items: vscode.QuickPickItem[] = [
                {
                  label: 'Model',
                  description: updated_api_configuration.model_provider_name,
                  detail: updated_api_configuration.model
                }
              ]

              const reset_reasoning_item: vscode.QuickPickItem = {
                label: 'Reasoning Effort',
                detail: updated_api_configuration.reasoning_effort
              }
              if (updated_api_configuration.reasoning_effort) {
                reset_reasoning_item.buttons = [
                  {
                    iconPath: new vscode.ThemeIcon('clear-all'),
                    tooltip: 'Unset'
                  }
                ]
              }
              reset_items.push(reset_reasoning_item)

              reset_items.push({ label: 'Advanced...' })
              quick_pick.items = reset_items
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

    if (selected_item.label == 'REFRESH') {
      continue
    }

    last_selected_label = selected_item.label
    const selected_option = selected_item.label

    if (selected_option == 'Model') {
      let current_model_provider_name = updated_api_configuration.model_provider_name

      while (true) {
        const new_model_provider = await edit_model_provider_for_api_configuration(
          providers_manager,
          current_model_provider_name
        )

        if (!new_model_provider) {
          break
        }

        current_model_provider_name = new_model_provider.model_provider_name

        const temp_api_configuration = {
          ...updated_api_configuration,
          model_provider_name: new_model_provider.model_provider_name,
          model:
            new_model_provider.model_provider_name === updated_api_configuration.model_provider_name
              ? updated_api_configuration.model
              : ''
        }
        const new_model = await edit_model_for_api_configuration({
          api_configuration: temp_api_configuration,
          providers_manager,
          model_fetcher,
          tool_type: params.tool_type
        })
        if (new_model !== undefined) {
          if (
            updated_api_configuration.model_provider_name != new_model_provider.model_provider_name ||
            updated_api_configuration.model != new_model
          ) {
            delete updated_api_configuration.temperature
            delete updated_api_configuration.reasoning_effort
          }
          updated_api_configuration.model_provider_name = new_model_provider.model_provider_name
          updated_api_configuration.model = new_model
          break
        }
      }
    } else if (selected_option == 'Reasoning Effort') {
      while (true) {
        const new_effort = await edit_reasoning_effort_for_api_config(
          updated_api_configuration.reasoning_effort
        )
        if (new_effort === undefined) break

        let is_valid = true
        if (new_effort !== null) {
          const model_provider = await providers_manager.get_model_provider(
            updated_api_configuration.model_provider_name
          )
          if (model_provider) {
            const base_url = model_provider.base_url

            if (base_url) {
              try {
                await vscode.window.withProgress(
                  {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Checking reasoning effort validity...',
                    cancellable: true
                  },
                  async (_progress, token) => {
                    await verify_reasoning_effort({
                      endpoint_url: base_url!,
                      api_key: model_provider.api_key,
                      model: updated_api_configuration.model,
                      reasoning_effort: new_effort as string,
                      model_provider,
                      cancellation_token: token
                    })
                  }
                )
              } catch (error: any) {
                is_valid = false
                if (error?.message != 'Cancelled') {
                  vscode.window.showWarningMessage(
                    dictionary.warning_message.REASONING_EFFORT_NOT_SUPPORTED
                  )
                }
              }
            }
          }
        }

        if (is_valid) {
          updated_api_configuration.reasoning_effort =
            new_effort === null ? undefined : (new_effort as any)
          break
        }
      }
    } else if (selected_option == 'Advanced...') {
      let last_advanced_label: string | undefined
      while (true) {
        const temperature_item: vscode.QuickPickItem = {
          label: 'Temperature',
          description: 'Leave empty with reasoning models',
          detail: updated_api_configuration.temperature?.toString()
        }
        if (updated_api_configuration.temperature != null) {
          temperature_item.buttons = [
            { iconPath: new vscode.ThemeIcon('eraser'), tooltip: 'Unset' }
          ]
        }

        const advanced_items: vscode.QuickPickItem[] = [temperature_item]

        if (params.tool_type == 'edit-context') {
          const system_instr_item: vscode.QuickPickItem = {
            label: 'System Instructions',
            description: 'Overrides global system instructions',
            detail: updated_api_configuration.system_instructions_override
          }
          if (updated_api_configuration.system_instructions_override) {
            system_instr_item.buttons = [
              { iconPath: new vscode.ThemeIcon('eraser'), tooltip: 'Unset' }
            ]
          }

          advanced_items.push(system_instr_item)
        }

        const selected_advanced = await new Promise<
          vscode.QuickPickItem | undefined
        >((resolve) => {
          const quick_pick = vscode.window.createQuickPick()
          quick_pick.items = advanced_items
          quick_pick.title = 'Edit API Configuration'
          quick_pick.placeholder = 'Select a property to edit'
          quick_pick.buttons = [vscode.QuickInputButtons.Back]
          if (last_advanced_label) {
            const active = advanced_items.find(
              (i) => i.label == last_advanced_label
            )
            if (active) quick_pick.activeItems = [active]
          }
          let accepted = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            quick_pick.onDidTriggerItemButton((e) => {
              if (e.item.label == 'Temperature') {
                delete updated_api_configuration.temperature
                accepted = true
                resolve({ label: 'REFRESH' })
                quick_pick.hide()
              } else if (e.item.label === 'System Instructions') {
                delete updated_api_configuration.system_instructions_override
                accepted = true
                resolve({ label: 'REFRESH' })
                quick_pick.hide()
              }
            }),
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
        if (selected_advanced.label == 'REFRESH') continue

        last_advanced_label = selected_advanced.label

        if (selected_advanced.label == 'Temperature') {
          const new_temp = await edit_temperature_for_api_configuration(updated_api_configuration)
          if (new_temp !== undefined) {
            updated_api_configuration.temperature =
              new_temp === null ? undefined : new_temp
          }
        } else if (selected_advanced.label == 'System Instructions') {
          const new_instr =
            await edit_system_instructions_override_for_api_configuration(updated_api_configuration)
          if (new_instr !== undefined) {
            updated_api_configuration.system_instructions_override =
              new_instr === null ? undefined : new_instr
          }
        }
      }
    }
  }

  const new_id = get_api_configuration_id(updated_api_configuration)

  if (original_id) {
    const original_api_configuration = api_configurations.find(
      (c) => get_api_configuration_id(c) === original_id
    )
    if (JSON.stringify(original_api_configuration) === JSON.stringify(updated_api_configuration)) {
      return
    }

    if (
      new_id !== original_id &&
      api_configurations.some((c) => get_api_configuration_id(c) === new_id)
    ) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
      )
      return
    }

    const index = api_configurations.findIndex(
      (c) => get_api_configuration_id(c) === original_id
    )
    if (index !== -1) {
      api_configurations[index] = updated_api_configuration
    }
  } else {
    if (api_configurations.some((c) => get_api_configuration_id(c) === new_id)) {
      vscode.window.showErrorMessage(
        dictionary.error_message.CONFIGURATION_ALREADY_EXISTS
      )
      return
    }
    if (params.create_on_top) {
      api_configurations.unshift(updated_api_configuration)
    } else if (actual_insertion_index !== undefined) {
      api_configurations.splice(actual_insertion_index, 0, updated_api_configuration)
    } else {
      api_configurations.push(updated_api_configuration)
    }
  }

  await providers_manager.save_api_configurations(api_configurations)

  if (was_default && set_default_api_configuration) {
    await set_default_api_configuration(updated_api_configuration)
  }
}

const verify_reasoning_effort = async (params: {
  endpoint_url: string
  api_key?: string
  model: string
  reasoning_effort: string
  model_provider: ModelProvider
  cancellation_token: vscode.CancellationToken
}): Promise<void> => {
  const cancel_source = axios.CancelToken.source()

  const disposable = params.cancellation_token.onCancellationRequested(() => {
    cancel_source.cancel('User cancelled')
  })

  const body = {
    model: params.model,
    messages: [
      {
        role: 'user',
        // Keep possibly hidden reasoning as short as possible
        content: 'Respond with "Hello!" and nothing else.'
      }
    ],
    stream: true
  }

  apply_reasoning_effort({
    body,
    model_provider: params.model_provider,
    reasoning_effort: params.reasoning_effort as any
  })

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

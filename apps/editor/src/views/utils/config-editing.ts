import * as vscode from 'vscode'
import axios from 'axios'
import {
  ModelProvidersManager,
  Provider,
  ToolConfig
} from '@/services/model-providers-manager'
import {
  ModelFetcher,
  MODELS_ROUTE_NOT_FOUND_ERROR
} from '@/services/model-fetcher'
import { PROVIDERS } from '@shared/constants/providers'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { upsert_model_provider } from './upsert-model-provider'
import { ToolType } from '../settings/types/tools'

export const initial_select_provider = async (
  context: vscode.ExtensionContext,
  providers_manager: ModelProvidersManager,
  last_selected_provider_name?: string
): Promise<Provider | undefined> => {
  while (true) {
    const providers = await providers_manager.get_providers()

    if (providers.length == 0) {
      const new_provider = await upsert_model_provider({ context })
      if (new_provider) {
        return new_provider
      }
      return undefined
    }

    const provider_items = providers.map((p) => ({
      label: p.name,
      provider: p
    }))
    const add_new_item = {
      label: '$(plus) New model provider...',
      provider: undefined
    }

    const selected = await new Promise<
      { label: string; provider?: Provider } | undefined
    >((resolve) => {
      const quick_pick = vscode.window.createQuickPick<{
        label: string
        provider?: Provider
      }>()
      quick_pick.items = [
        add_new_item,
        {
          label: 'model providers',
          kind: vscode.QuickPickItemKind.Separator
        } as any,
        ...provider_items
      ]
      quick_pick.title = 'New Configuration'
      quick_pick.placeholder = 'Select a model provider'
      const close_button: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
      quick_pick.buttons = [close_button]
      if (last_selected_provider_name) {
        const active = provider_items.find(
          (p) => p.label == last_selected_provider_name
        )
        if (active) quick_pick.activeItems = [active]
      }
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

    if (!selected) {
      return undefined
    }

    if (selected.label == add_new_item.label) {
      const new_provider = await upsert_model_provider({
        context,
        show_back_button: true
      })
      if (new_provider) {
        return new_provider
      }
      continue
    }

    return selected.provider
  }
}

export const initial_select_model = async (
  model_fetcher: ModelFetcher,
  provider: Provider,
  tool_type?: ToolType
): Promise<string | undefined> => {
  let base_url: string | undefined

  try {
    base_url =
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

      let last_selected_model_id: string | undefined

      while (true) {
        const selected_model = await new Promise<string | undefined>(
          (resolve) => {
            const quick_pick = vscode.window.createQuickPick()
            quick_pick.items = model_items
            quick_pick.title = 'Models'
            quick_pick.placeholder = 'Choose a model'
            quick_pick.buttons = [vscode.QuickInputButtons.Back]

            if (last_selected_model_id) {
              const active = model_items.find(
                (item) =>
                  (item.description || item.label) === last_selected_model_id
              )
              if (active) quick_pick.activeItems = [active]
            }

            let accepted = false
            const disposables: vscode.Disposable[] = []

            disposables.push(
              quick_pick.onDidAccept(() => {
                accepted = true
                const selected = quick_pick.selectedItems[0]
                resolve(selected.description || selected.label)
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
          }
        )

        if (!selected_model) return undefined

        last_selected_model_id = selected_model

        if (
          await verify_model({
            model: selected_model,
            base_url,
            api_key: provider.api_key,
            is_voice_input: tool_type == 'voice-input'
          })
        ) {
          return selected_model
        }
      }
    }
  } catch (error) {
    Logger.error({
      function_name: 'initial_select_model',
      message: 'Failed to fetch models',
      data: error
    })
    if (
      error instanceof Error &&
      error.message == MODELS_ROUTE_NOT_FOUND_ERROR
    ) {
      vscode.window.showInformationMessage(
        dictionary.information_message.MODELS_ROUTE_NOT_FOUND(provider.name),
        { modal: true }
      )
    } else {
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_FETCH_MODELS(
          error instanceof Error ? error.message : String(error)
        )
      )
    }
  }

  while (true) {
    const input = await vscode.window.showInputBox({
      title: 'Models',
      prompt: 'Could not fetch models. Please enter a model name (ID).'
    })

    if (!input) return undefined
    const model = input.trim()

    if (
      !base_url ||
      (await verify_model({
        model,
        base_url,
        api_key: provider.api_key,
        is_voice_input: tool_type == 'voice-input'
      }))
    ) {
      return model
    }
  }
}

export const edit_provider_for_config = async (
  providers_manager: ModelProvidersManager,
  current_provider_name?: string
) => {
  const providers = await providers_manager.get_providers()
  const provider_items = providers.map((p) => ({
    label: p.name,
    provider: p
  }))
  const selected_provider_item = await new Promise<
    (typeof provider_items)[0] | undefined
  >((resolve) => {
    const quick_pick =
      vscode.window.createQuickPick<(typeof provider_items)[0]>()
    quick_pick.items = provider_items
    quick_pick.title = 'Model Providers'
    quick_pick.placeholder = 'Select a model provider'
    quick_pick.buttons = [vscode.QuickInputButtons.Back]
    if (current_provider_name) {
      const active = provider_items.find(
        (p) => p.label === current_provider_name
      )
      if (active) quick_pick.activeItems = [active]
    }
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

  if (selected_provider_item) {
    return {
      provider_name: selected_provider_item.provider.name,
      provider_type: selected_provider_item.provider.type
    }
  }
  return undefined
}

export const edit_model_for_config = async (
  config: ToolConfig,
  providers_manager: ModelProvidersManager,
  model_fetcher: ModelFetcher,
  tool_type?: ToolType
) => {
  const provider_from_manager = await providers_manager.get_provider(
    config.provider_name
  )
  if (!provider_from_manager) {
    vscode.window.showErrorMessage(
      dictionary.error_message.PROVIDER_NOT_FOUND(config.provider_name)
    )
    return undefined
  }

  const base_url =
    provider_from_manager.type == 'built-in'
      ? PROVIDERS[provider_from_manager.name]?.base_url
      : provider_from_manager.base_url

  if (!base_url) {
    vscode.window.showErrorMessage(
      dictionary.error_message.BASE_URL_NOT_FOUND_FOR_PROVIDER(
        config.provider_name
      )
    )
    return undefined
  }

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

      let last_selected_model_id = config.model

      while (true) {
        const selected_model_item = await new Promise<
          (typeof model_items)[0] | undefined
        >((resolve) => {
          const quick_pick =
            vscode.window.createQuickPick<(typeof model_items)[0]>()
          quick_pick.items = model_items
          quick_pick.title = 'Models'
          quick_pick.placeholder = 'Choose a model'
          quick_pick.buttons = [vscode.QuickInputButtons.Back]
          if (last_selected_model_id) {
            const active = model_items.find(
              (item) =>
                (item.description || item.label) === last_selected_model_id
            )
            if (active) quick_pick.activeItems = [active]
          }
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

        if (!selected_model_item) return undefined

        const model = (
          selected_model_item.description || selected_model_item.label
        ).trim()

        last_selected_model_id = model

        if (
          await verify_model({
            model,
            base_url,
            api_key: provider_from_manager.api_key,
            is_voice_input: tool_type == 'voice-input'
          })
        ) {
          return model
        }
      }
    } else {
      vscode.window.showWarningMessage(
        dictionary.warning_message.NO_MODELS_FOUND_MANUAL_ENTRY(
          config.provider_name
        )
      )
    }
  } catch (error) {
    Logger.error({
      function_name: 'edit_model_for_config',
      message: 'Failed to fetch models',
      data: error
    })
    if (
      error instanceof Error &&
      error.message == MODELS_ROUTE_NOT_FOUND_ERROR
    ) {
      vscode.window.showInformationMessage(
        dictionary.information_message.MODELS_ROUTE_NOT_FOUND_MANUAL_ENTRY(
          config.provider_name
        ),
        { modal: true }
      )
    } else {
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_FETCH_MODELS(
          error instanceof Error ? error.message : String(error)
        )
      )
    }
  }

  while (true) {
    const new_model_input = await vscode.window.showInputBox({
      title: 'Models',
      value: config.model,
      prompt: `Enter a model name (ID)`
    })

    if (!new_model_input) return undefined
    const model = new_model_input.trim()

    if (
      await verify_model({
        model,
        base_url,
        api_key: provider_from_manager.api_key,
        is_voice_input: tool_type == 'voice-input'
      })
    ) {
      return model
    }
  }
}

export const edit_temperature_for_config = async (
  config: ToolConfig
): Promise<number | null | undefined> => {
  return await new Promise<number | null | undefined>((resolve) => {
    const input = vscode.window.createInputBox()
    input.title = 'Edit Configuration'
    input.value = config.temperature?.toString() ?? ''
    input.prompt = 'Enter a value between 0 and 2.'
    input.placeholder = 'Temperature'

    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input.onDidAccept(() => {
        const value = input.value
        if (value.trim() == '') {
          accepted = true
          resolve(null)
          input.hide()
          return
        }
        const num = parseFloat(value)
        if (isNaN(num) || num < 0 || num > 2) {
          input.validationMessage = 'Please enter a number between 0 and 2.'
          return
        }
        accepted = true
        resolve(num)
        input.hide()
      }),
      input.onDidChangeValue((value) => {
        if (value.trim() == '') {
          input.validationMessage = undefined
          return
        }
        const num = parseFloat(value)
        if (isNaN(num) || num < 0 || num > 2) {
          input.validationMessage = 'Please enter a number between 0 and 2.'
        } else {
          input.validationMessage = undefined
        }
      }),
      input.onDidHide(() => {
        if (!accepted) resolve(undefined)
        disposables.forEach((d) => d.dispose())
        input.dispose()
      })
    )
    input.show()
  })
}

export const edit_system_instructions_override_for_config = async (
  config: ToolConfig
): Promise<string | null | undefined> => {
  return await new Promise<string | null | undefined>((resolve) => {
    const input = vscode.window.createInputBox()
    input.title = 'Edit Configuration'
    input.value = config.system_instructions_override ?? ''
    input.prompt = 'Enter system instructions override.'
    input.placeholder = 'System Instructions Override'

    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input.onDidAccept(() => {
        const value = input.value
        if (value.trim() == '') {
          accepted = true
          resolve(null)
          input.hide()
          return
        }
        accepted = true
        resolve(value)
        input.hide()
      }),
      input.onDidHide(() => {
        if (!accepted) resolve(undefined)
        disposables.forEach((d) => d.dispose())
        input.dispose()
      })
    )
    input.show()
  })
}

export const edit_reasoning_effort_for_config = async (
  current_effort?: string
) => {
  const effort_options: vscode.QuickPickItem[] = [
    {
      label: 'Unset',
      description: 'Remove reasoning effort from the configuration'
    },
    { label: 'None' },
    { label: 'Minimal' },
    { label: 'Low' },
    { label: 'Medium' },
    { label: 'High' }
  ]

  return await new Promise<string | null | undefined>((resolve) => {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = effort_options
    quick_pick.title = 'Edit Configuration'
    quick_pick.placeholder = 'Select reasoning effort'
    quick_pick.buttons = [vscode.QuickInputButtons.Back]
    if (current_effort) {
      const active = effort_options.find(
        (item) => item.label.toLowerCase() === current_effort.toLowerCase()
      )
      if (active) quick_pick.activeItems = [active]
    }

    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      quick_pick.onDidAccept(() => {
        accepted = true
        const selected = quick_pick.selectedItems[0]
        if (selected) {
          resolve(
            selected.label == 'Unset' ? null : selected.label.toLowerCase()
          )
        } else {
          resolve(undefined)
        }
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
}

const verify_model = async (params: {
  model: string
  base_url: string
  api_key?: string
  is_voice_input?: boolean
}): Promise<boolean> => {
  let error: any | undefined
  let success = false

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Sending test message...',
      cancellable: true
    },
    async (_progress, token) => {
      try {
        const messages: any[] = params.is_voice_input
          ? [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Transcribe this audio.' },
                  {
                    type: 'input_audio',
                    input_audio: { data: '', format: 'wav' }
                  }
                ]
              }
            ]
          : [
              {
                role: 'user',
                content: 'Test'
              }
            ]

        await axios.post(
          `${params.base_url}/chat/completions`,
          {
            model: params.model,
            messages,
            max_tokens: 1
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(params.api_key
                ? { Authorization: `Bearer ${params.api_key}` }
                : {})
            },
            cancelToken: new axios.CancelToken((c) => {
              token.onCancellationRequested(() => {
                c('User cancelled')
              })
            })
          }
        )
        success = true
      } catch (e: any) {
        if (!token.isCancellationRequested) {
          error = e
        }
      }
    }
  )

  if (success) {
    return true
  }

  if (!error) {
    return false
  }

  const title = 'Test message failed'
  let detail = 'Error'

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      let reason = 'Server Error'
      switch (status) {
        case 400:
          reason = 'Bad Request'
          break
        case 401:
          reason = 'Authentication Error'
          break
        case 403:
          reason = 'Access Forbidden'
          break
        case 404:
          reason = 'Model not found'
          break
        case 429:
          reason = 'Rate limit exceeded'
          break
        case 500:
          reason = 'Internal Server Error'
          break
        case 502:
          reason = 'Bad Gateway'
          break
        case 503:
          reason = 'Service Unavailable'
          break
      }
      detail = `Status code: ${status} (${reason})`
    } else if (error.code) {
      detail = error.message
    }
  }

  const choice = await vscode.window.showWarningMessage(
    title,
    { modal: true, detail },
    'Use Anyway'
  )
  return choice == 'Use Anyway'
}

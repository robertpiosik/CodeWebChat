import * as vscode from 'vscode'
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

export const initial_select_provider = async (
  providers_manager: ModelProvidersManager,
  last_selected_provider_name?: string
): Promise<Provider | undefined> => {
  const providers = await providers_manager.get_providers()

  if (providers.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NO_MODEL_PROVIDERS_FOUND,
      { modal: true }
    )
    vscode.commands.executeCommand('codeWebChat.settings', 'model-providers')
    return
  }

  const provider_items = providers.map((p) => ({ label: p.name, provider: p }))
  const selected = await new Promise<(typeof provider_items)[0] | undefined>(
    (resolve) => {
      const quick_pick =
        vscode.window.createQuickPick<(typeof provider_items)[0]>()
      quick_pick.items = provider_items
      quick_pick.title = 'Create New Configuration'
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
    }
  )
  return selected?.provider
}

export const initial_select_model = async (
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

      return await new Promise<string | undefined>((resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = model_items
        quick_pick.title = 'Create New Configuration'
        quick_pick.placeholder = 'Choose an AI model'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]
        if (provider.name) {
          // Currently initial_select_model doesn't take a previous selection,
          // but if we wanted to highlight one, we would do it here.
          // Since this is the "Add" flow, usually we don't have a previous model yet.
          // Skipping activeItems for initial add flow model selection as per current logic.
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
      })
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

  return await vscode.window.showInputBox({
    title: 'Create New Configuration',
    prompt: 'Could not fetch models. Please enter a model name (ID).'
  })
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
    quick_pick.title = 'Edit Configuration'
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
  model_fetcher: ModelFetcher
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
      const selected_model_item = await new Promise<
        (typeof model_items)[0] | undefined
      >((resolve) => {
        const quick_pick =
          vscode.window.createQuickPick<(typeof model_items)[0]>()
        quick_pick.items = model_items
        quick_pick.title = 'Edit Configuration'
        quick_pick.placeholder = 'Choose a model'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]
        if (config.model) {
          const active = model_items.find(
            (item) => (item.description || item.label) === config.model
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
      if (selected_model_item) {
        return (
          selected_model_item.description || selected_model_item.label
        ).trim()
      }
      return undefined
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

  const new_model_input = await vscode.window.showInputBox({
    title: 'Edit Configuration',
    value: config.model,
    prompt: `Enter a model name (ID)`
  })
  if (new_model_input !== undefined) {
    return new_model_input.trim()
  }
  return undefined
}

export const edit_temperature_for_config = async (
  config: ToolConfig
): Promise<number | null | undefined> => {
  return await new Promise<number | null | undefined>((resolve) => {
    const input = vscode.window.createInputBox()
    input.title = 'Edit Configuration'
    input.value = config.temperature?.toString() ?? ''
    input.prompt = 'Enter a value between 0 and 2. Leave empty to unset.'
    input.buttons = [vscode.QuickInputButtons.Back]

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
      input.onDidTriggerButton((button) => {
        if (button === vscode.QuickInputButtons.Back) {
          input.hide()
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

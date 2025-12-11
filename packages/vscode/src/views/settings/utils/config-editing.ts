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
  providers_manager: ModelProvidersManager
): Promise<Provider | undefined> => {
  const providers = await providers_manager.get_providers()

  if (providers.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NO_MODEL_PROVIDERS_CONFIGURED
    )
    return
  }

  const provider_items = providers.map((p) => ({ label: p.name, provider: p }))
  const selected = await vscode.window.showQuickPick(provider_items, {
    title: 'Model Providers'
  })

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
        quick_pick.title = 'Models'
        quick_pick.placeholder = 'Choose an AI model'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]

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
    title: 'Enter Model Name',
    prompt: 'Could not fetch models. Please enter a model name (ID).'
  })
}

export const edit_provider_for_config = async (
  providers_manager: ModelProvidersManager
) => {
  const providers = await providers_manager.get_providers()
  const provider_items = providers.map((p) => ({
    label: p.name,
    detail: p.type,
    provider: p
  }))
  const selected_provider_item = await vscode.window.showQuickPick(
    provider_items,
    { title: 'Model Providers' }
  )
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

  let new_model_value: string | undefined
  let model_selected = false

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
      const selected_model_item = await vscode.window.showQuickPick(
        model_items,
        { title: 'Models', placeHolder: 'Choose a model' }
      )
      if (selected_model_item) {
        new_model_value =
          selected_model_item.description || selected_model_item.label
        model_selected = true
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

  if (!model_selected) {
    const new_model_input = await vscode.window.showInputBox({
      title: 'Enter Model Name',
      value: config.model,
      prompt: `Enter a model name (ID)`
    })
    if (new_model_input !== undefined) {
      new_model_value = new_model_input
    }
  }

  if (new_model_value !== undefined) {
    return new_model_value.trim()
  }
  return undefined
}

export const edit_temperature_for_config = async (
  config: ToolConfig
): Promise<number | null | undefined> => {
  const new_temp_str = await vscode.window.showInputBox({
    title: 'Edit Temperature',
    value: config.temperature?.toString() ?? '',
    prompt: 'Enter a value between 0 and 2. Leave empty to unset.',
    validateInput: (value) => {
      if (value.trim() === '') {
        return null
      }
      const num = parseFloat(value)
      if (isNaN(num) || num < 0 || num > 2) {
        return 'Please enter a number between 0 and 2.'
      }
      return null
    }
  })
  if (new_temp_str === undefined) return undefined
  if (new_temp_str.trim() === '') return null
  return parseFloat(new_temp_str)
}

export const edit_reasoning_effort_for_config = async () => {
  const effort_options: vscode.QuickPickItem[] = [
    { label: 'Unset', description: 'Remove reasoning effort configuration' },
    { label: 'low' },
    { label: 'medium' },
    { label: 'high' }
  ]
  const selected_effort = await vscode.window.showQuickPick(effort_options, {
    title: 'Select Reasoning Effort'
  })

  if (!selected_effort) return undefined
  if (selected_effort.label == 'Unset') return null
  return selected_effort.label
}

export const edit_instructions_placement_for_config = async () => {
  const placement_options: (vscode.QuickPickItem & {
    value: 'above-and-below' | 'below-only'
  })[] = [
    {
      label: 'Above and Below',
      value: 'above-and-below',
      detail: 'Places instructions both before and after the context (default).'
    },
    {
      label: 'Below Only',
      value: 'below-only',
      detail:
        'Places instructions only after the context. This may improve cost-efficienty by enabling prompt caching.'
    }
  ]
  const selected_placement = await vscode.window.showQuickPick(
    placement_options,
    { title: 'Select Instructions Placement' }
  )
  return selected_placement?.value
}

export const edit_max_concurrency_for_config = async (config: ToolConfig) => {
  const new_concurrency_str = await vscode.window.showInputBox({
    title: 'Edit Max Concurrency',
    value: String(config.max_concurrency ?? 1),
    prompt: 'Enter a number for max concurrency',
    validateInput: (value) => {
      const num = parseInt(value, 10)
      if (isNaN(num) || !Number.isInteger(num) || num < 1) {
        return 'Please enter a whole number greater than or equal to 1.'
      }
      return null
    }
  })
  if (new_concurrency_str !== undefined)
    return parseInt(new_concurrency_str, 10)
  return undefined
}

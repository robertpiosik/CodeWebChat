import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  ApiConfiguration
} from '@/services/model-providers-manager'
import {
  ModelFetcher,
  MODELS_ROUTE_NOT_FOUND_ERROR
} from '@/services/model-fetcher'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { ToolType } from '../../../settings/types/tools'
import { verify_model } from '../../create-api-configuration/interactions/verify-model'

export const edit_model_for_api_configuration = async (params: {
  api_configuration: ApiConfiguration
  providers_manager: ModelProvidersManager
  model_fetcher: ModelFetcher
  tool_type?: ToolType
}) => {
  const model_provider_from_manager =
    await params.providers_manager.get_model_provider(
      params.api_configuration.model_provider_name
    )
  if (!model_provider_from_manager) {
    vscode.window.showErrorMessage(
      dictionary.error_message.MODEL_PROVIDER_NOT_FOUND_BY_NAME(
        params.api_configuration.model_provider_name
      )
    )
    return undefined
  }

  const base_url = model_provider_from_manager.base_url

  if (!base_url) {
    vscode.window.showErrorMessage(
      dictionary.error_message.BASE_URL_NOT_FOUND_FOR_PROVIDER(
        params.api_configuration.model_provider_name
      )
    )
    return undefined
  }

  try {
    const models = await params.model_fetcher.get_models({
      base_url,
      api_key: model_provider_from_manager.api_key
    })

    if (models.length > 0) {
      const model_items = models.map((model) => ({
        label: model.name || model.id,
        description: model.name ? model.id : undefined,
        detail: model.description
      }))

      let last_selected_model_id = params.api_configuration.model

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
            api_key: model_provider_from_manager.api_key,
            is_voice_input: params.tool_type == 'voice-input'
          })
        ) {
          return model
        }
      }
    } else {
      vscode.window.showWarningMessage(
        dictionary.warning_message.NO_MODELS_FOUND_MANUAL_ENTRY(
          params.api_configuration.model_provider_name
        )
      )
    }
  } catch (error) {
    Logger.error({
      function_name: 'edit_model_for_api_config',
      message: 'Failed to fetch models',
      data: error
    })
    if (
      error instanceof Error &&
      error.message == MODELS_ROUTE_NOT_FOUND_ERROR
    ) {
      vscode.window.showInformationMessage(
        dictionary.information_message.MODELS_ROUTE_NOT_FOUND_MANUAL_ENTRY(
          params.api_configuration.model_provider_name
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
      value: params.api_configuration.model,
      prompt: `Enter a model name (ID)`
    })

    if (!new_model_input) return undefined
    const model = new_model_input.trim()

    if (
      await verify_model({
        model,
        base_url,
        api_key: model_provider_from_manager.api_key,
        is_voice_input: params.tool_type == 'voice-input'
      })
    ) {
      return model
    }
  }
}

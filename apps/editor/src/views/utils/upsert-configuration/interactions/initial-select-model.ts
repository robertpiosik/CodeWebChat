import * as vscode from 'vscode'
import { Provider } from '@/services/model-providers-manager'
import {
  ModelFetcher,
  MODELS_ROUTE_NOT_FOUND_ERROR
} from '@/services/model-fetcher'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { ToolType } from '../../../settings/types/tools'
import { verify_model } from './verify-model'

export const initial_select_model = async (
  model_fetcher: ModelFetcher,
  provider: Provider,
  tool_type?: ToolType
): Promise<string | undefined> => {
  let base_url: string | undefined

  try {
    base_url = provider.base_url

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

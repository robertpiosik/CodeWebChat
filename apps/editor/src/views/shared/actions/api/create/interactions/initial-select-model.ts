import * as vscode from 'vscode'
import { ModelProvider } from '@/services/model-providers-manager'
import {
  ModelFetcher,
  MODELS_ROUTE_NOT_FOUND_ERROR
} from '@/services/model-fetcher'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { verify_model } from './verify-model'
import { t } from '@/i18n'

export const initial_select_model = async (
  model_fetcher: ModelFetcher,
  model_provider: ModelProvider
): Promise<string | undefined> => {
  let base_url: string | undefined

  try {
    base_url = model_provider.base_url

    if (!base_url)
      throw new Error(
        `Base URL not found for model provider ${model_provider.name}`
      )

    const models = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t(
          'views.shared.actions.api.create.interactions.initial-select-model.fetching-models'
        ),
        cancellable: false
      },
      async () => {
        return await model_fetcher.get_models({
          base_url: base_url as string,
          api_key: model_provider.api_key
        })
      }
    )

    if (models.length > 0) {
      const manual_entry_item: vscode.QuickPickItem = {
        label: `$(add) ${t(
          'views.shared.actions.api.create.interactions.initial-select-model.enter-manually'
        )}`,
        alwaysShow: true
      }

      const separator_item: vscode.QuickPickItem = {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      }

      const model_items: vscode.QuickPickItem[] = [
        manual_entry_item,
        separator_item,
        ...models.map((model) => ({
          label: model.name || model.id,
          description: model.name ? model.id : undefined,
          detail: model.description
        }))
      ]

      let last_selected_model_id: string | undefined

      while (true) {
        const selected_model_item = await new Promise<
          vscode.QuickPickItem | undefined
        >((resolve) => {
          const quick_pick =
            vscode.window.createQuickPick<vscode.QuickPickItem>()
          quick_pick.items = model_items
          quick_pick.title = t(
            'views.shared.actions.api.create.interactions.initial-select-model.title'
          )
          quick_pick.placeholder = t(
            'views.shared.actions.api.create.interactions.initial-select-model.placeholder'
          )
          quick_pick.buttons = [vscode.QuickInputButtons.Back]

          if (last_selected_model_id) {
            const active = model_items.find(
              (item) =>
                item !== separator_item &&
                item !== manual_entry_item &&
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

        if (selected_model_item === manual_entry_item) {
          break
        }

        const selected_model = (
          selected_model_item.description || selected_model_item.label
        ).trim()

        last_selected_model_id = selected_model

        if (
          await verify_model({
            model: selected_model,
            base_url,
            api_key: model_provider.api_key
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
        dictionary.information_message.MODELS_ROUTE_NOT_FOUND(
          model_provider.name
        ),
        { modal: true }
      )
    } else {
      vscode.window.showErrorMessage(
        t('views.shared.actions.api.common.error.failed-to-fetch-models', {
          message: error instanceof Error ? error.message : String(error)
        })
      )
    }
  }

  while (true) {
    const input = await vscode.window.showInputBox({
      title: t(
        'views.shared.actions.api.create.interactions.initial-select-model.title'
      ),
      prompt: t(
        'views.shared.actions.api.create.interactions.initial-select-model.prompt'
      )
    })

    if (!input) return undefined
    const model = input.trim()

    if (
      !base_url ||
      (await verify_model({
        model,
        base_url,
        api_key: model_provider.api_key
      }))
    ) {
      return model
    }
  }
}

import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  ModelProvider
} from '@/services/model-providers-manager'
import { upsert_model_provider } from '../../upsert-model-provider'

export const initial_select_model_provider = async (
  context: vscode.ExtensionContext,
  providers_manager: ModelProvidersManager,
  last_selected_model_provider_name?: string
): Promise<ModelProvider | undefined> => {
  while (true) {
    const model_providers = await providers_manager.get_model_providers()

    if (model_providers.length == 0) {
      const new_model_provider = await upsert_model_provider({ context })
      if (new_model_provider) {
        return new_model_provider
      }
      return undefined
    }

    const model_provider_items = model_providers.map((p) => ({
      label: p.name,
      model_provider: p
    }))
    const add_new_item = {
      label: '$(plus) New model provider...',
      model_provider: undefined
    }

    const selected = await new Promise<
      { label: string; model_provider?: ModelProvider } | undefined
    >((resolve) => {
      const quick_pick = vscode.window.createQuickPick<{
        label: string
        model_provider?: ModelProvider
      }>()
      quick_pick.items = [
        add_new_item,
        {
          label: 'model providers',
          kind: vscode.QuickPickItemKind.Separator
        } as any,
        ...model_provider_items
      ]
      quick_pick.title = 'New API Configuration'
      quick_pick.placeholder = 'Select a model provider'
      const close_button: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
      quick_pick.buttons = [close_button]
      if (last_selected_model_provider_name) {
        const active = model_provider_items.find(
          (p) => p.label == last_selected_model_provider_name
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
      const new_model_provider = await upsert_model_provider({
        context,
        show_back_button: true
      })
      if (new_model_provider) {
        return new_model_provider
      }
      continue
    }

    return selected.model_provider
  }
}

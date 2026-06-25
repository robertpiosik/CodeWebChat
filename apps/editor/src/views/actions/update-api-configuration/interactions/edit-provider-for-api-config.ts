import * as vscode from 'vscode'
import { ModelProvidersManager } from '@/services/model-providers-manager'

export const edit_model_provider_for_api_configuration = async (
  providers_manager: ModelProvidersManager,
  current_model_provider_name?: string
) => {
  const model_providers = await providers_manager.get_model_providers()
  const model_provider_items = model_providers.map((p) => ({
    label: p.name,
    model_provider: p
  }))
  const selected_model_provider_item = await new Promise<
    (typeof model_provider_items)[0] | undefined
  >((resolve) => {
    const quick_pick =
      vscode.window.createQuickPick<(typeof model_provider_items)[0]>()
    quick_pick.items = model_provider_items
    quick_pick.title = 'Model Providers'
    quick_pick.placeholder = 'Select a model provider'
    const close_button: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: 'Close'
    }
    quick_pick.buttons = [close_button]
    if (current_model_provider_name) {
      const active = model_provider_items.find(
        (p) => p.label === current_model_provider_name
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

  if (selected_model_provider_item) {
    return {
      model_provider_name: selected_model_provider_item.model_provider.name
    }
  }
  return undefined
}

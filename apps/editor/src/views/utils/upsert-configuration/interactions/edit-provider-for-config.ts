import * as vscode from 'vscode'
import { ModelProvidersManager } from '@/services/model-providers-manager'

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

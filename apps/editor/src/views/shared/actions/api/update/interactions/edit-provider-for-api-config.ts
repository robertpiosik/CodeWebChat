import * as vscode from 'vscode'
import { ProvidersManager } from '@/services/providers-manager'
import { t } from '@/i18n'

export const edit_provider_for_api_configuration = async (
  providers_manager: ProvidersManager,
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
    quick_pick.title = t(
      'views.shared.actions.api.upsert-provider.options.title'
    )
    quick_pick.placeholder = t(
      'views.shared.actions.api.create.interactions.initial-select-provider.placeholder'
    )
    const close_button: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }
    quick_pick.buttons = [close_button]
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

  if (selected_provider_item) {
    return {
      provider_name: selected_provider_item.provider.name
    }
  }
  return undefined
}

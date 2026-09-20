import * as vscode from 'vscode'
import { ProvidersManager, Provider } from '@/services/providers-manager'
import { t } from '@/i18n'
import { open_settings } from '@/views/settings/helpers/open-settings'

export const initial_select_provider = async (
  providers_manager: ProvidersManager,
  last_selected_provider_name?: string
): Promise<Provider | undefined> => {
  const providers = await providers_manager.get_providers()

  if (providers.length == 0) {
    const open_settings_btn = t('common.open-settings')
    const selection = await vscode.window.showWarningMessage(
      t(
        'views.shared.actions.api.create.interactions.initial-select-provider.no-providers-found'
      ),
      open_settings_btn
    )
    if (selection == open_settings_btn) {
      open_settings.api.providers()
    }
    return undefined
  }

  const provider_items = providers.map((p) => ({
    label: p.name,
    provider: p
  }))

  const selected = await new Promise<
    { label: string; provider?: Provider } | undefined
  >((resolve) => {
    const quick_pick = vscode.window.createQuickPick<{
      label: string
      provider?: Provider
    }>()
    quick_pick.ignoreFocusOut = true
    quick_pick.items = provider_items
    quick_pick.title = t(
      'views.shared.actions.api.create.interactions.initial-select-provider.title'
    )
    quick_pick.placeholder = t(
      'views.shared.actions.api.create.interactions.initial-select-provider.placeholder'
    )
    const close_button: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
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

  return selected.provider
}

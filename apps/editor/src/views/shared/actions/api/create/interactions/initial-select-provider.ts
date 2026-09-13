import * as vscode from 'vscode'
import {
  ProvidersManager,
  Provider
} from '@/services/providers-manager'
import { upsert_provider } from '../../upsert-provider'
import { t } from '@/i18n'

export const initial_select_provider = async (
  extension_context: vscode.ExtensionContext,
  providers_manager: ProvidersManager,
  last_selected_provider_name?: string
): Promise<Provider | undefined> => {
  while (true) {
    const providers = await providers_manager.get_providers()

    if (providers.length == 0) {
      const new_provider = await upsert_provider({ extension_context })
      if (new_provider) {
        return new_provider
      }
      return undefined
    }

    const provider_items = providers.map((p) => ({
      label: p.name,
      provider: p
    }))
    const add_new_item = {
      label: t(
        'views.shared.actions.api.create.interactions.initial-select-provider.add-new'
      ),
      provider: undefined
    }

    const selected = await new Promise<
      { label: string; provider?: Provider } | undefined
    >((resolve) => {
      const quick_pick = vscode.window.createQuickPick<{
        label: string
        provider?: Provider
      }>()
      quick_pick.items = [
        add_new_item,
        {
          label: t(
            'views.shared.actions.api.create.interactions.initial-select-provider.separator'
          ),
          kind: vscode.QuickPickItemKind.Separator
        } as any,
        ...provider_items
      ]
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

    if (selected.label == add_new_item.label) {
      const new_provider = await upsert_provider({
        extension_context,
        show_back_button: true
      })
      if (new_provider) {
        return new_provider
      }
      continue
    }

    return selected.provider
  }
}

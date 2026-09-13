import * as vscode from 'vscode'
import axios from 'axios'
import { t } from '@/i18n'

type ModelsDevProvider = {
  name: string
  doc?: string
  api?: string
}

type ModelsDevResponse = Record<string, ModelsDevProvider>

export const pick_extended_provider = async (): Promise<
  { name: string; url: string } | null | 'BACK'
> => {
  try {
    const response = await axios.get<ModelsDevResponse>(
      'https://models.dev/api.json'
    )
    const providers_data = response.data

    const extended_items: vscode.QuickPickItem[] = Object.values(providers_data)
      .filter((p) => p && p.api)
      .map((p) => ({
        label: p.name,
        detail: p.api,
        buttons: p.doc
          ? [
              {
                iconPath: new vscode.ThemeIcon('globe'),
                tooltip: p.doc
              }
            ]
          : undefined
      }))

    const extended_quick_pick = vscode.window.createQuickPick()
    extended_quick_pick.ignoreFocusOut = true
    extended_quick_pick.items = extended_items
    extended_quick_pick.title = t(
      'views.shared.actions.api.upsert-provider.options.extended-title'
    )
    extended_quick_pick.placeholder = t(
      'views.shared.actions.api.upsert-provider.options.extended-placeholder'
    )

    const close_button: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }
    extended_quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

    const ext_choice = await new Promise<
      { name: string; url: string } | null | 'BACK'
    >((resolve) => {
      extended_quick_pick.onDidTriggerButton((button) => {
        if (button === close_button) {
          extended_quick_pick.hide()
        } else if (button === vscode.QuickInputButtons.Back) {
          resolve('BACK')
          extended_quick_pick.hide()
        }
      })
      extended_quick_pick.onDidTriggerItemButton((e) => {
        const button = e.button
        if (button.tooltip) {
          vscode.env.openExternal(vscode.Uri.parse(button.tooltip))
        }
      })
      extended_quick_pick.onDidAccept(() => {
        const selected = extended_quick_pick.selectedItems[0]
        extended_quick_pick.hide()
        if (!selected) return resolve(null)
        resolve({ name: selected.label, url: selected.detail || '' })
      })
      extended_quick_pick.onDidHide(() => {
        extended_quick_pick.dispose()
        resolve(null)
      })
      extended_quick_pick.show()
    })

    return ext_choice
  } catch (e) {
    vscode.window.showErrorMessage(
      t('views.shared.actions.api.pick-extended-provider.error')
    )
    return 'BACK'
  }
}

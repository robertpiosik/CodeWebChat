import * as vscode from 'vscode'
import { PROVIDERS } from '@/constants/providers'
import { t } from '@/i18n'

export const pick_provider_source = async (params?: {
  show_back_button?: boolean
}): Promise<{ id?: string; is_extended?: boolean } | null | 'BACK'> => {
  const custom_label = t(
    'views.shared.actions.api.upsert-provider.options.custom-label'
  )
  const extended_label = t(
    'views.shared.actions.api.upsert-provider.options.extended-label'
  )
  const available_built_in = Object.entries(PROVIDERS)

  const items: vscode.QuickPickItem[] = [
    {
      label: custom_label,
      description: t(
        'views.shared.actions.api.upsert-provider.options.custom-desc'
      )
    },
    {
      label: extended_label,
      description: t(
        'views.shared.actions.api.upsert-provider.options.extended-desc'
      ),
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('globe'),
          tooltip: 'https://models.dev/'
        }
      ]
    },
    {
      label: t(
        'views.shared.actions.api.upsert-provider.options.predefined'
      ),
      kind: vscode.QuickPickItemKind.Separator
    },
    ...available_built_in.map(([id, info]) => ({
      label: id,
      detail: info.base_url
    }))
  ]

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = t(
    'views.shared.actions.api.upsert-provider.options.title'
  )
  quick_pick.placeholder = t(
    'views.shared.actions.api.upsert-provider.options.placeholder'
  )

  const close_button: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  if (params?.show_back_button) {
    quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
  } else {
    quick_pick.buttons = [close_button]
  }

  return new Promise((resolve) => {
    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        quick_pick.hide()
        resolve('BACK')
      } else if (button === close_button) {
        quick_pick.hide()
      }
    })
    quick_pick.onDidTriggerItemButton((e) => {
      if (e.item.label === extended_label) {
        vscode.env.openExternal(vscode.Uri.parse('https://models.dev/'))
      }
    })
    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      quick_pick.hide()
      if (!selected) return resolve(null)

      if (selected.label === custom_label) {
        resolve({})
      } else if (selected.label === extended_label) {
        resolve({ is_extended: true })
      } else {
        resolve({ id: selected.label })
      }
    })
    quick_pick.onDidHide(() => {
      quick_pick.dispose()
      resolve(null)
    })
    quick_pick.show()
  })
}

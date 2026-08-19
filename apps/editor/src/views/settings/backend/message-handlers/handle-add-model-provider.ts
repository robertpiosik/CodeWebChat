import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'
import { PROVIDERS } from '@/constants/providers'
import { AddModelProviderMessage } from '@/views/settings/types/messages'
import { t } from '@/i18n'

export const handle_add_model_provider = async (
  provider: SettingsViewProvider,
  message: AddModelProviderMessage
): Promise<void> => {
  let insertion_index: number | undefined = message.insertion_index

  if (message.insertion_index !== undefined && !message.exact_insertion) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          {
            label: t('common.placement-above')
          },
          {
            label: t('common.placement-below')
          }
        ]
        quick_pick.title = t(
          'views.shared.actions.api.upsert-provider.placement.title'
        )
        quick_pick.placeholder = t(
          'views.shared.actions.api.upsert-provider.placement.placeholder'
        )
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
        ]

        let accepted = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidTriggerButton(() => {
            quick_pick.hide()
          }),
          quick_pick.onDidAccept(() => {
            accepted = true
            resolve(quick_pick.selectedItems[0]?.label)
            quick_pick.hide()
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

    if (!position_quick_pick) return

    insertion_index =
      position_quick_pick == t('common.placement-above')
        ? message.insertion_index
        : message.insertion_index + 1
  }

  const custom_label = '$(edit) Custom endpoint...'
  const available_built_in = Object.entries(PROVIDERS)

  const items: vscode.QuickPickItem[] = [
    {
      label: custom_label,
      description: 'You can use any OpenAI-API compatible provider'
    },
    {
      label: 'predefined endpoints',
      kind: vscode.QuickPickItemKind.Separator
    },
    ...available_built_in.map(([id, info]) => ({
      label: id,
      detail: info.base_url
    }))
  ]

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = 'Model Providers'
  quick_pick.placeholder =
    'Choose a predefined provider or add a custom endpoint'

  const close_button: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: 'Close'
  }
  quick_pick.buttons = [close_button]

  const choice = await new Promise<{ id?: string } | null>((resolve) => {
    quick_pick.onDidTriggerButton((button) => {
      if (button === close_button) {
        quick_pick.hide()
      }
    })
    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      quick_pick.hide()
      if (!selected) return resolve(null)

      if (selected.label === custom_label) {
        resolve({})
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

  if (!choice) return

  let new_name = ''
  let new_base_url = ''

  if (choice.id) {
    const name = choice.id as keyof typeof PROVIDERS
    const info = PROVIDERS[name]
    new_name = name
    new_base_url = info.base_url
  }

  provider.postMessage({
    command: 'START_MODEL_PROVIDER_CREATION',
    provider: {
      name: new_name,
      base_url: new_base_url,
      api_key_mask: '',
      extended_cache: undefined
    },
    insertion_index
  })
}

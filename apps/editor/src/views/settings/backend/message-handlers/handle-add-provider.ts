import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'
import { PROVIDERS } from '@/constants/providers'
import { AddProviderMessage } from '@/views/settings/types/messages'
import { t } from '@/i18n'
import { pick_extended_provider } from '@/views/shared/actions/api/pick-extended-provider'
import { pick_provider_source } from '@/views/shared/actions/api/pick-provider-source'

export const handle_add_provider = async (
  provider: SettingsViewProvider,
  message: AddProviderMessage
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

  while (true) {
    const choice = await pick_provider_source()

    if (choice === 'BACK' || !choice) return

    let new_name = ''
    let new_base_url = ''

    if (choice.is_extended) {
      const ext_choice = await pick_extended_provider()

      if (ext_choice === 'BACK') {
        continue
      }

      if (!ext_choice) return

      new_name = ext_choice.name
      new_base_url = ext_choice.url
    } else if (choice.id) {
      const name = choice.id as keyof typeof PROVIDERS
      const info = PROVIDERS[name]
      new_name = name
      new_base_url = info.base_url
    }

    provider.postMessage({
      command: 'START_PROVIDER_CREATION',
      provider: {
        name: new_name,
        base_url: new_base_url,
        api_key_mask: '',
        extended_cache: undefined
      },
      insertion_index
    })
    break
  }
}

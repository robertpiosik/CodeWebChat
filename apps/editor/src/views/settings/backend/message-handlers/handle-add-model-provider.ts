import * as vscode from 'vscode'
import { SettingsProvider } from '../settings-provider'
import { PROVIDERS } from '@/constants/providers'
import { AddModelProviderMessage } from '@/views/settings/types/messages'

export const handle_add_model_provider = async (
  provider: SettingsProvider,
  message: AddModelProviderMessage
): Promise<void> => {
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
      api_key_mask: ''
    },
    insertion_index: message.insertion_index,
    create_on_top: message.create_on_top
  })
}

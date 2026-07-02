import * as vscode from 'vscode'
import {
  ApiConfiguration,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { t } from '@/i18n'

export type ShowApiConfigurationQuickPickOptions = {
  api_configurations: ApiConfiguration[]
  last_selected_id?: string
  title?: string
  placeholder?: string
  show_back_button?: boolean
}

export const show_api_configuration_quick_pick = async (
  options: ShowApiConfigurationQuickPickOptions
): Promise<
  { api_configuration: ApiConfiguration; id: string } | 'back' | undefined
> => {
  const {
    api_configurations,
    last_selected_id,
    title = t('common.config.title'),
    placeholder = 'Select a configuration',
    show_back_button = false
  } = options

  type Item = vscode.QuickPickItem & {
    api_configuration?: ApiConfiguration
    id?: string
  }

  const map_api_configuration_to_item = (
    api_configuration: ApiConfiguration
  ): Item => {
    const description_parts = [api_configuration.model_provider_name]
    if (api_configuration.temperature != null) {
      description_parts.push(`${api_configuration.temperature}`)
    }
    if (api_configuration.reasoning_effort) {
      description_parts.push(`${api_configuration.reasoning_effort}`)
    }

    return {
      label: api_configuration.model,
      description: description_parts.join(' · '),
      api_configuration,
      id: get_api_configuration_id(api_configuration)
    }
  }

  const items: Item[] = []
  const pinned = api_configurations.filter((c) => c.is_pinned)
  if (pinned.length > 0) {
    items.push({ label: 'Pinned', kind: vscode.QuickPickItemKind.Separator })
    items.push(...pinned.map(map_api_configuration_to_item))
    items.push({ label: 'All', kind: vscode.QuickPickItemKind.Separator })
  }
  items.push(...api_configurations.map(map_api_configuration_to_item))

  const quick_pick = vscode.window.createQuickPick<Item>()
  quick_pick.items = items
  quick_pick.title = title
  quick_pick.placeholder = placeholder
  quick_pick.matchOnDescription = true

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  if (show_back_button) {
    quick_pick.buttons = [vscode.QuickInputButtons.Back]
  } else {
    quick_pick.buttons = [close_button]
  }

  const last_selected_item = items.find((item) => item.id === last_selected_id)
  if (last_selected_item) {
    quick_pick.activeItems = [last_selected_item]
  } else if (items.length > 0) {
    const first_selectable = items.find(
      (i) => i.kind !== vscode.QuickPickItemKind.Separator
    )
    if (first_selectable) {
      quick_pick.activeItems = [first_selectable]
    }
  }

  return new Promise<
    { api_configuration: ApiConfiguration; id: string } | 'back' | undefined
  >((resolve) => {
    let resolved = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        resolved = true
        resolve('back')
        quick_pick.hide()
      } else if (
        button === close_button ||
        button.tooltip === t('common.close')
      ) {
        resolved = true
        resolve(undefined)
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      if (selected && selected.api_configuration && selected.id) {
        resolved = true
        resolve({
          api_configuration: selected.api_configuration,
          id: selected.id
        })
      }
      quick_pick.hide()
    })

    quick_pick.onDidHide(() => {
      quick_pick.dispose()
      if (!resolved) {
        resolve(undefined)
      }
    })

    quick_pick.show()
  })
}

import * as vscode from 'vscode'
import {
  ApiConfiguration,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { t } from '@/i18n'

export type ShowConfigurationQuickPickOptions<T> = {
  items: T[]
  map_item: (item: T) => {
    label: string
    description?: string
    id: string
    is_pinned?: boolean
  }
  last_selected_id?: string
  title?: string
  placeholder?: string
  show_back_button?: boolean
}

export const map_api_configuration_to_item = (
  api_configuration: ApiConfiguration
) => {
  const description_parts = [api_configuration.model_provider_name]
  if (api_configuration.reasoning_effort) {
    description_parts.push(`${api_configuration.reasoning_effort}`)
  }

  return {
    label: api_configuration.model,
    description: description_parts.join(' · '),
    id: get_api_configuration_id(api_configuration),
    is_pinned: api_configuration.is_pinned
  }
}

export const show_configuration_quick_pick = async <T>(
  options: ShowConfigurationQuickPickOptions<T>
): Promise<{ item: T; id: string } | 'back' | undefined> => {
  const {
    items: configurations,
    map_item,
    last_selected_id,
    title = t('common.config.title'),
    placeholder = 'Select a configuration',
    show_back_button = false
  } = options

  type PickItem = vscode.QuickPickItem & {
    original_item?: T
    id?: string
  }

  const map_to_quick_pick_item = (config: T): PickItem => {
    const mapped = map_item(config)
    return {
      label: mapped.label,
      description: mapped.description,
      original_item: config,
      id: mapped.id
    }
  }

  const items: PickItem[] = []

  const mapped_configs = configurations.map((c) => ({
    config: c,
    mapped: map_item(c)
  }))
  const pinned = mapped_configs.filter((c) => c.mapped.is_pinned)
  const unpinned = mapped_configs.filter((c) => !c.mapped.is_pinned)

  if (pinned.length > 0) {
    items.push({ label: 'pinned', kind: vscode.QuickPickItemKind.Separator })
    items.push(...pinned.map((c) => map_to_quick_pick_item(c.config)))
    if (unpinned.length > 0) {
      items.push({ label: 'all', kind: vscode.QuickPickItemKind.Separator })
    }
  }

  items.push(...mapped_configs.map((c) => map_to_quick_pick_item(c.config)))

  const quick_pick = vscode.window.createQuickPick<PickItem>()
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

  return new Promise<{ item: T; id: string } | 'back' | undefined>(
    (resolve) => {
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
        if (selected && selected.original_item && selected.id) {
          resolved = true
          resolve({
            item: selected.original_item,
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
    }
  )
}

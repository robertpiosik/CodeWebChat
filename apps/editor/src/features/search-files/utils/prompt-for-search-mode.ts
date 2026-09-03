import * as vscode from 'vscode'
import { t } from '@/i18n'

export const prompt_for_search_mode = async (
  last_mode: 'phrase' | 'keywords' | 'intelligent' | 'agent',
  show_back_button?: boolean,
  is_workspace_action?: boolean
): Promise<'phrase' | 'keywords' | 'intelligent' | 'agent' | undefined | 'back'> => {
  const items: (vscode.QuickPickItem & {
    mode: 'phrase' | 'keywords' | 'intelligent' | 'agent'
  })[] = [
    {
      label: t('feature.search-files.mode.phrase'),
      description: t('feature.search-files.mode.phrase-description'),
      mode: 'phrase'
    },
    {
      label: t('feature.search-files.mode.keywords'),
      description: t('feature.search-files.mode.keywords-description'),
      mode: 'keywords'
    },
    {
      label: t('feature.search-files.mode.intelligent'),
      description: t('feature.search-files.mode.intelligent-description'),
      mode: 'intelligent'
    }
  ]

  if (is_workspace_action) {
    items.push({
      label: t('feature.search-files.mode.agent'),
      description: t('feature.search-files.mode.agent-description'),
      mode: 'agent'
    })
  }

  const active_item = items.find((i) => i.mode == last_mode) || items[0]

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & {
      mode: 'phrase' | 'keywords' | 'intelligent' | 'agent'
    }
  >()
  quick_pick.items = items
  quick_pick.activeItems = [active_item]
  quick_pick.title = t('feature.search-files.mode.title')
  quick_pick.placeholder = t('feature.search-files.mode.placeholder')
  quick_pick.ignoreFocusOut = false

  const buttons: vscode.QuickInputButton[] = [close_button]
  if (show_back_button) {
    buttons.unshift(vscode.QuickInputButtons.Back)
  }
  quick_pick.buttons = buttons

  return new Promise((resolve) => {
    let is_resolved = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        resolve('back')
        quick_pick.hide()
      } else if (button === close_button) {
        resolve(undefined)
        quick_pick.hide()
      }
    })

    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      if (selected) {
        is_resolved = true
        resolve(selected.mode)
        quick_pick.hide()
      }
    })

    quick_pick.onDidHide(() => {
      if (!is_resolved) {
        resolve(undefined)
      }
      quick_pick.dispose()
    })

    quick_pick.show()
  })
}

import * as vscode from 'vscode'
import { t } from '@/i18n'

export const prompt_for_search_mode = async (
  last_mode: 'phrase' | 'keywords' | 'intelligent'
): Promise<'phrase' | 'keywords' | 'intelligent' | undefined> => {
  const items: (vscode.QuickPickItem & {
    mode: 'phrase' | 'keywords' | 'intelligent'
  })[] = [
    {
      label: t('command.search.mode.phrase'),
      description: t('command.search.mode.phrase-description'),
      mode: 'phrase'
    },
    {
      label: t('command.search.mode.keywords'),
      description: t('command.search.mode.keywords-description'),
      mode: 'keywords'
    },
    {
      label: t('command.search.mode.intelligent'),
      description: t('command.search.mode.intelligent-description'),
      mode: 'intelligent'
    }
  ]

  const active_item = items.find((i) => i.mode === last_mode) || items[0]

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { mode: 'phrase' | 'keywords' | 'intelligent' }
  >()
  quick_pick.items = items
  quick_pick.activeItems = [active_item]
  quick_pick.title = t('command.search.mode.title')
  quick_pick.ignoreFocusOut = false
  quick_pick.buttons = [close_button]

  return new Promise((resolve) => {
    let is_resolved = false

    quick_pick.onDidTriggerButton((button) => {
      if (button === close_button) {
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

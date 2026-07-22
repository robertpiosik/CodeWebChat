import * as vscode from 'vscode'
import { t } from '@/i18n'

export const prompt_for_filename_match_mode = async (
  last_mode: 'all' | 'some'
): Promise<'all' | 'some' | 'back' | undefined> => {
  const items: (vscode.QuickPickItem & { mode: 'all' | 'some' })[] = [
    {
      label: t('feature.search-files.filename.match-mode.all'),
      description: t(
        'feature.search-files.filename.match-mode.all-description'
      ),
      mode: 'all'
    },
    {
      label: t('feature.search-files.filename.match-mode.some'),
      description: t(
        'feature.search-files.filename.match-mode.some-description'
      ),
      mode: 'some'
    }
  ]

  const active_item = items.find((i) => i.mode == last_mode) || items[0]

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { mode: 'all' | 'some' }
  >()
  quick_pick.items = items
  quick_pick.activeItems = [active_item]
  quick_pick.title = t('feature.search-files.filename.match-mode.title')
  quick_pick.placeholder = t(
    'feature.search-files.filename.match-mode.placeholder'
  )
  quick_pick.ignoreFocusOut = false
  quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

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

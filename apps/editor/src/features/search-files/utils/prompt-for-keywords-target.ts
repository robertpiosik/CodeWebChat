import * as vscode from 'vscode'
import { t } from '@/i18n'

export const prompt_for_keywords_target = async (
  last_target: 'contents' | 'filenames' | 'both'
): Promise<'contents' | 'filenames' | 'both' | 'back' | undefined> => {
  const items: (vscode.QuickPickItem & {
    target: 'contents' | 'filenames' | 'both'
  })[] = [
    {
      label: t('feature.search-files.keywords.target.contents'),
      description: t(
        'feature.search-files.keywords.target.contents-description'
      ),
      target: 'contents'
    },
    {
      label: t('feature.search-files.keywords.target.filenames'),
      description: t(
        'feature.search-files.keywords.target.filenames-description'
      ),
      target: 'filenames'
    },
    {
      label: t('feature.search-files.keywords.target.both'),
      description: t('feature.search-files.keywords.target.both-description'),
      target: 'both'
    }
  ]

  const active_item = items.find((i) => i.target == last_target) || items[0]

  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { target: 'contents' | 'filenames' | 'both' }
  >()
  quick_pick.items = items
  quick_pick.activeItems = [active_item]
  quick_pick.title = t('feature.search-files.keywords.target.title')
  quick_pick.placeholder = t('feature.search-files.keywords.target.placeholder')
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
        resolve(selected.target)
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

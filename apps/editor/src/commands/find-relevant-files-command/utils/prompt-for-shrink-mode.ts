import * as vscode from 'vscode'
import { display_token_count } from '../../../utils/display-token-count'
import { t } from '@/i18n'

export const prompt_for_shrink_mode = async (params: {
  should_shrink: boolean
  full_tokens: number
  shrink_tokens: number
}): Promise<boolean | 'back' | 'cancel'> => {
  const shrink_items: vscode.QuickPickItem[] = [
    {
      label: t('command.find-relevant-files.shrink.full'),
      description: `${display_token_count(params.full_tokens)} tokens`
    },
    {
      label: t('command.find-relevant-files.shrink.strip'),
      description: `${display_token_count(params.shrink_tokens)} tokens`
    }
  ]

  const shrink_quick_pick = vscode.window.createQuickPick()
  shrink_quick_pick.items = shrink_items
  shrink_quick_pick.title = t('command.find-relevant-files.input.title')
  shrink_quick_pick.placeholder = t(
    'command.find-relevant-files.shrink.placeholder'
  )
  shrink_quick_pick.activeItems = [
    params.should_shrink ? shrink_items[1] : shrink_items[0]
  ]
  shrink_quick_pick.buttons = [vscode.QuickInputButtons.Back]

  return new Promise<boolean | 'back' | 'cancel'>((resolve) => {
    let is_resolved = false
    shrink_quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        is_resolved = true
        resolve('back')
        shrink_quick_pick.hide()
      }
    })
    shrink_quick_pick.onDidAccept(() => {
      is_resolved = true
      resolve(
        shrink_quick_pick.selectedItems[0].label ===
          t('command.find-relevant-files.shrink.strip')
      )
      shrink_quick_pick.hide()
    })
    shrink_quick_pick.onDidHide(() => {
      if (!is_resolved) {
        resolve('cancel')
      }
      shrink_quick_pick.dispose()
    })
    shrink_quick_pick.show()
  })
}

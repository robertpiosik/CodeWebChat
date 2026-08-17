import * as vscode from 'vscode'
import { t } from '@/i18n'
import { LAST_SEARCH_FILES_MERGE_REPLACE_OPTION_STATE_KEY } from '@/constants/state-keys'

export const prompt_for_merge_or_replace = async (params: {
  extension_context: vscode.ExtensionContext
  title?: string
}): Promise<'merge' | 'replace' | undefined> => {
  const last_action = params.extension_context.workspaceState.get<string>(
    LAST_SEARCH_FILES_MERGE_REPLACE_OPTION_STATE_KEY
  )

  const action = await new Promise<{ value: 'merge' | 'replace' } | undefined>(
    (resolve) => {
      const quick_pick = vscode.window.createQuickPick<{
        label: string
        description: string
        value: 'merge' | 'replace'
      }>()
      const items: {
        label: string
        description: string
        value: 'merge' | 'replace'
      }[] = [
        {
          label: t('command.search-files.action.merge'),
          description: t('command.search-files.action.merge-description'),
          value: 'merge'
        },
        {
          label: t('command.search-files.action.replace'),
          description: t('command.search-files.action.replace-description'),
          value: 'replace'
        }
      ]
      quick_pick.items = items
      const active_item = items.find((i) => i.value === last_action) || items[0]
      quick_pick.activeItems = [active_item]
      if (params.title) {
        quick_pick.title = params.title
      }
      quick_pick.placeholder = t(
        'command.search-files.action.merge-or-replace-placeholder'
      )
      quick_pick.ignoreFocusOut = true

      let is_resolved = false

      quick_pick.onDidAccept(() => {
        const selected = quick_pick.selectedItems[0]
        if (selected) {
          is_resolved = true
          resolve({ value: selected.value })
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
    }
  )

  if (action) {
    await params.extension_context.workspaceState.update(
      LAST_SEARCH_FILES_MERGE_REPLACE_OPTION_STATE_KEY,
      action.value
    )
    return action.value
  }

  return undefined
}

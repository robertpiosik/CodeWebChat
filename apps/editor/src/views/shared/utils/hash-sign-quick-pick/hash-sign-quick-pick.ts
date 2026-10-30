import * as vscode from 'vscode'
import { t } from '@/i18n'
import { LAST_SELECTED_SYMBOL_STATE_KEY } from '@/constants/state-keys'
import {
  handle_changes_item,
  handle_commit_item,
  handle_saved_context_item,
  handle_skill_item,
  handle_snippet_item
} from './symbols'

const accuracy_boost_label = `$(target) ${t('views.shared.utils.hash-sign-quick-pick.quick-pick.accuracy-boost.label')}`
const changes_label = `$(git-pull-request-draft) ${t('views.shared.utils.hash-sign-quick-pick.quick-pick.changes.label')}`
const commit_label = `$(git-commit) ${t('views.shared.utils.hash-sign-quick-pick.quick-pick.commit.label')}`
const saved_context_label = `$(checklist) ${t('views.shared.utils.hash-sign-quick-pick.quick-pick.saved-context.label')}`
const skill_label = `$(thinking) ${t('views.shared.utils.hash-sign-quick-pick.quick-pick.skill.label')}`
const snippet_label = `$(surround-with) ${t('views.shared.utils.hash-sign-quick-pick.quick-pick.snippets.label')}`

export const hash_sign_quick_pick = async (params: {
  extension_context: vscode.ExtensionContext
  on_insert: (text: string) => void
  prompt_type?: 'ask' | 'edit'
  include?: (
    | 'accuracy-boost'
    | 'changes'
    | 'commit'
    | 'saved-context'
    | 'skill'
    | 'snippets'
  )[]
}): Promise<string | undefined> => {
  const items: vscode.QuickPickItem[] = (
    [
      {
        label: accuracy_boost_label,
        description: t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.accuracy-boost.description'
        )
      },
      {
        label: changes_label,
        description: t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.changes.description'
        )
      },
      {
        label: commit_label,
        description: t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.commit.description'
        )
      },
      {
        label: saved_context_label,
        description: t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.saved-context.description'
        )
      },
      {
        label: skill_label,
        description: t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.skill.description'
        ),
        buttons: [
          {
            iconPath: new vscode.ThemeIcon('globe'),
            tooltip: t(
              'views.shared.utils.hash-sign-quick-pick.quick-pick.skill.tooltip'
            )
          }
        ]
      },
      {
        label: snippet_label,
        description: t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.snippets.description'
        )
      }
    ] as vscode.QuickPickItem[]
  ).filter((item) => {
    if (params.include) {
      if (item.label === changes_label && !params.include.includes('changes')) {
        return false
      }
      if (item.label === commit_label && !params.include.includes('commit')) {
        return false
      }
      if (
        item.label === saved_context_label &&
        !params.include.includes('saved-context')
      ) {
        return false
      }
      if (item.label === skill_label && !params.include.includes('skill')) {
        return false
      }
      if (
        item.label === accuracy_boost_label &&
        !params.include.includes('accuracy-boost')
      ) {
        return false
      }
      if (
        item.label === snippet_label &&
        !params.include.includes('snippets')
      ) {
        return false
      }
    }
    return true
  })

  const last_selected_symbol =
    params.extension_context.workspaceState.get<string>(
      LAST_SELECTED_SYMBOL_STATE_KEY
    )
  let last_selected_item: vscode.QuickPickItem | undefined = items.find(
    (item) => item.label === last_selected_symbol
  )

  while (true) {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.placeholder = t(
      'views.shared.utils.hash-sign-quick-pick.quick-pick.placeholder'
    )
    quick_pick.matchOnDescription = true
    quick_pick.title = t(
      'views.shared.utils.hash-sign-quick-pick.quick-pick.title'
    )
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('common.close')
      }
    ]

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    }

    const selected = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        let is_accepted = false
        quick_pick.onDidTriggerButton(() => {
          quick_pick.hide()
        })
        quick_pick.onDidTriggerItemButton(async (e) => {
          if (e.item.label === skill_label) {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://skills.sh/')
            )
          }
        })
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems[0])
          quick_pick.hide()
        })
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
          }
          quick_pick.dispose()
        })
        quick_pick.show()
      }
    )

    if (!selected) {
      return
    }

    last_selected_item = selected
    await params.extension_context.workspaceState.update(
      LAST_SELECTED_SYMBOL_STATE_KEY,
      selected.label
    )

    let result: string | 'continue' | undefined

    switch (selected.label) {
      case changes_label:
        result = await handle_changes_item(params.extension_context)
        break
      case commit_label:
        result = await handle_commit_item(
          params.extension_context,
          params.on_insert
        )
        break
      case saved_context_label:
        result = await handle_saved_context_item(params.extension_context)
        break
      case skill_label:
        result = await handle_skill_item()
        break
      case snippet_label:
        result = await handle_snippet_item(params.prompt_type)
        break
      case accuracy_boost_label: {
        const confirm_label = t(
          'views.shared.utils.hash-sign-quick-pick.quick-pick.accuracy-boost.confirm-modal.confirm'
        )
        const confirm = await vscode.window.showWarningMessage(
          t(
            'views.shared.utils.hash-sign-quick-pick.quick-pick.accuracy-boost.confirm-modal.message'
          ),
          { modal: true },
          confirm_label
        )
        if (confirm === confirm_label) {
          result = '#AccuracyBoost'
        } else {
          result = 'continue'
        }
        break
      }
      default:
        continue
    }

    if (result === 'continue') {
      continue
    }

    return result
  }
}

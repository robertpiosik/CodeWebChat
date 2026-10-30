import * as vscode from 'vscode'
import { t } from '@/i18n'
import { open_settings } from '@/views/settings/helpers/open-settings'

export const handle_snippet_item = async (
  prompt_type?: 'ask' | 'edit'
): Promise<string | undefined> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  let instructions: { name: string; instruction: string }[] = []

  const ask_instructions = config.get<any[]>('snippetsForAskAboutFiles') || []
  const edit_instructions = config.get<any[]>('snippetsForEditFiles') || []

  if (prompt_type === 'ask') {
    instructions = ask_instructions
  } else if (prompt_type === 'edit') {
    instructions = edit_instructions
  } else {
    instructions = [...ask_instructions, ...edit_instructions]
  }

  if (!instructions || instructions.length === 0) {
    const selection = await vscode.window.showInformationMessage(
      t(
        'views.shared.utils.hash-sign-quick-pick.snippet-symbol.no-instructions' as any
      ),
      t('common.open-settings')
    )

    if (selection === t('common.open-settings')) {
      open_settings.general.prompt()
    }

    return undefined
  }

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = instructions.map((i) => ({
    label: i.name
  }))
  quick_pick.placeholder = t(
    'views.shared.utils.hash-sign-quick-pick.snippet-symbol.placeholder' as any
  )
  quick_pick.title = t(
    'views.shared.utils.hash-sign-quick-pick.snippet-symbol.title' as any
  )

  return new Promise((resolve) => {
    let is_accepted = false
    quick_pick.onDidAccept(() => {
      is_accepted = true
      const selected = quick_pick.selectedItems[0]
      if (selected) {
        const escaped_name = selected.label
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
        resolve(`#Snippet("${escaped_name}")`)
      } else {
        resolve(undefined)
      }
      quick_pick.hide()
    })
    quick_pick.onDidHide(() => {
      if (!is_accepted) {
        resolve(undefined)
      }
      quick_pick.dispose()
    })
    quick_pick.show()
  })
}

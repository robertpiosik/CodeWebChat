import * as vscode from 'vscode'
import { EDIT_FORMAT_STATE_KEY } from '@/constants/state-keys'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { SelectEditFormatMessage } from '@/views/prompt/types/messages'
import { EditFormat } from '@shared/types/edit-format'
import { t } from '@/i18n'

export const handle_select_edit_format = async (
  prompt_view_provider: PromptViewProvider,
  _: SelectEditFormatMessage
): Promise<void> => {
  const current_format = prompt_view_provider.edit_format
  const is_mac = process.platform == 'darwin'

  const items: (vscode.QuickPickItem & { value: EditFormat })[] = [
    {
      label: t('views.prompt.handlers.select-edit-format.items.whole'),
      description: is_mac ? '⌥W' : 'Alt+W',
      detail: t(
        'views.prompt.handlers.select-edit-format.items.whole.description'
      ),
      value: 'whole'
    },
    {
      label: t('views.prompt.handlers.select-edit-format.items.search-replace'),
      description: is_mac ? '⌥S' : 'Alt+S',
      detail: t(
        'views.prompt.handlers.select-edit-format.items.search-replace.description'
      ),
      value: 'search-replace'
    },
    {
      label: t('views.prompt.handlers.select-edit-format.items.diff'),
      description: is_mac ? '⌥D' : 'Alt+D',
      detail: t(
        'views.prompt.handlers.select-edit-format.items.diff.description'
      ),
      value: 'diff'
    },
    {
      label: t('views.prompt.handlers.select-edit-format.items.truncated'),
      description: is_mac ? '⌥T' : 'Alt+T',
      detail: t(
        'views.prompt.handlers.select-edit-format.items.truncated.description'
      ),
      value: 'truncated'
    }
  ]

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { value: EditFormat }
  >()
  quick_pick.items = items
  quick_pick.activeItems = items.filter((item) => item.value == current_format)
  quick_pick.placeholder = t(
    'views.prompt.handlers.select-edit-format.placeholder'
  )
  quick_pick.title = t('views.prompt.handlers.select-edit-format.title')
  quick_pick.buttons = [
    { iconPath: new vscode.ThemeIcon('close'), tooltip: t('common.close') }
  ]

  const selection = await new Promise<
    (vscode.QuickPickItem & { value: EditFormat }) | undefined
  >((resolve) => {
    quick_pick.onDidAccept(() => {
      resolve(quick_pick.selectedItems[0])
      quick_pick.hide()
    })
    quick_pick.onDidTriggerButton(() => {
      quick_pick.hide()
    })
    quick_pick.onDidHide(() => {
      resolve(undefined)
      quick_pick.dispose()
    })
    quick_pick.show()
  })

  if (!selection) {
    return
  }

  prompt_view_provider.edit_format = selection.value
  await prompt_view_provider.extension_context.workspaceState.update(
    EDIT_FORMAT_STATE_KEY,
    selection.value
  )
  await prompt_view_provider.extension_context.globalState.update(
    EDIT_FORMAT_STATE_KEY,
    selection.value
  )

  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: prompt_view_provider.edit_format
  })
}

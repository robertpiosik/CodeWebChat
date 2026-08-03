import * as vscode from 'vscode'
import { get_edit_format_state_key } from '@/constants/state-keys'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { SelectEditFormatMessage } from '@/views/prompt/types/messages'
import { EditFormat } from '@shared/types/edit-format'
import { t } from '@/i18n'
import { MODE } from '@/views/prompt/types/main-view-mode'

export const handle_select_edit_format = async (
  prompt_view_provider: PromptViewProvider,
  _: SelectEditFormatMessage
): Promise<void> => {
  const current_format = prompt_view_provider.edit_format

  const items: (vscode.QuickPickItem & { value: EditFormat })[] = [
    {
      label: t('views.prompt.handlers.select-edit-format.items.whole'),
      description: t(
        'views.prompt.handlers.select-edit-format.items.whole.hint'
      ),
      detail: t(
        'views.prompt.handlers.select-edit-format.items.whole.description'
      ),
      value: 'whole'
    },
    {
      label: t('views.prompt.handlers.select-edit-format.items.search-replace'),
      description: t(
        'views.prompt.handlers.select-edit-format.items.search-replace.hint'
      ),
      detail: t(
        'views.prompt.handlers.select-edit-format.items.search-replace.description'
      ),
      value: 'search-replace'
    },
    {
      label: t('views.prompt.handlers.select-edit-format.items.diff'),
      description: t(
        'views.prompt.handlers.select-edit-format.items.diff.hint'
      ),
      detail: t(
        'views.prompt.handlers.select-edit-format.items.diff.description'
      ),
      value: 'diff'
    },
    {
      label: t('views.prompt.handlers.select-edit-format.items.truncated'),
      description: t(
        'views.prompt.handlers.select-edit-format.items.truncated.hint'
      ),
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

  const config = vscode.workspace.getConfiguration('codeWebChat')
  const synchronize = config.get<boolean>(
    'synchronizeEditFormatBetweenModes',
    true
  )

  prompt_view_provider.edit_format = selection.value

  if (synchronize) {
    prompt_view_provider.web_edit_format = selection.value
    prompt_view_provider.api_edit_format = selection.value
    await Promise.all([
      prompt_view_provider.extension_context.workspaceState.update(
        get_edit_format_state_key(MODE.WEB),
        selection.value
      ),
      prompt_view_provider.extension_context.globalState.update(
        get_edit_format_state_key(MODE.WEB),
        selection.value
      ),
      prompt_view_provider.extension_context.workspaceState.update(
        get_edit_format_state_key(MODE.API),
        selection.value
      ),
      prompt_view_provider.extension_context.globalState.update(
        get_edit_format_state_key(MODE.API),
        selection.value
      )
    ])
  } else {
    await prompt_view_provider.extension_context.workspaceState.update(
      get_edit_format_state_key(prompt_view_provider.mode),
      selection.value
    )
    await prompt_view_provider.extension_context.globalState.update(
      get_edit_format_state_key(prompt_view_provider.mode),
      selection.value
    )
  }

  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: prompt_view_provider.edit_format
  })
}

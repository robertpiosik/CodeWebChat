import * as vscode from 'vscode'
import {
  API_EDIT_FORMAT_STATE_KEY,
  CHAT_EDIT_FORMAT_STATE_KEY
} from '@/constants/state-keys'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { SelectEditFormatMessage } from '@/views/panel/types/messages'
import { EditFormat } from '@shared/types/edit-format'
import { t } from '@/i18n'

export const handle_select_edit_format = async (
  panel_view_provider: PanelViewProvider,
  message: SelectEditFormatMessage
): Promise<void> => {
  const items: (vscode.QuickPickItem & { value: EditFormat })[] = [
    {
      label: t('views.panel.handlers.select-edit-format.items.whole'),
      value: 'whole'
    },
    {
      label: t('views.panel.handlers.select-edit-format.items.search-replace'),
      value: 'search-replace'
    },
    {
      label: t('views.panel.handlers.select-edit-format.items.diff'),
      value: 'diff'
    },
    {
      label: t('views.panel.handlers.select-edit-format.items.truncated'),
      value: 'truncated'
    }
  ]

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { value: EditFormat }
  >()
  quick_pick.items = items
  quick_pick.placeholder = t(
    'views.panel.handlers.select-edit-format.placeholder'
  )
  quick_pick.title = t('views.panel.handlers.select-edit-format.title')
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

  if (message.target == 'chat') {
    panel_view_provider.chat_edit_format = selection.value
    await panel_view_provider.extension_context.workspaceState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      selection.value
    )
    await panel_view_provider.extension_context.globalState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      selection.value
    )
  } else if (message.target == 'api') {
    panel_view_provider.api_edit_format = selection.value
    await panel_view_provider.extension_context.workspaceState.update(
      API_EDIT_FORMAT_STATE_KEY,
      selection.value
    )
    await panel_view_provider.extension_context.globalState.update(
      API_EDIT_FORMAT_STATE_KEY,
      selection.value
    )
  }

  panel_view_provider.send_message({
    command: 'EDIT_FORMAT',
    chat_edit_format: panel_view_provider.chat_edit_format,
    api_edit_format: panel_view_provider.api_edit_format
  })
}

import * as vscode from 'vscode'
import { CreateTemplateMessage } from '@/views/settings/types/messages'
import { SettingsViewProvider } from '../settings-view-provider'
import { t } from '@/i18n'

export const handle_create_template = async (
  provider: SettingsViewProvider,
  message: CreateTemplateMessage
): Promise<void> => {
  let insertion_index: number | undefined

  if (message.insertion_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          {
            label: t(
              'views.settings.handlers.handle-create-template.placement-above'
            )
          },
          {
            label: t(
              'views.settings.handlers.handle-create-template.placement-below'
            )
          }
        ]
        quick_pick.title = t(
          'views.settings.handlers.handle-create-template.title'
        )
        quick_pick.placeholder = t(
          'views.settings.handlers.handle-create-template.placeholder'
        )
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
        ]

        let accepted = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidTriggerButton(() => {
            quick_pick.hide()
          }),
          quick_pick.onDidAccept(() => {
            accepted = true
            resolve(quick_pick.selectedItems[0]?.label)
            quick_pick.hide()
          }),
          quick_pick.onDidHide(() => {
            if (!accepted) resolve(undefined)
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          })
        )

        quick_pick.show()
      }
    )

    if (!position_quick_pick) return

    insertion_index =
      position_quick_pick ==
      t('views.settings.handlers.handle-create-template.placement-above')
        ? message.insertion_index
        : message.insertion_index + 1
  }

  provider.postMessage({
    command: 'START_TEMPLATE_CREATION',
    templates_key: message.templates_key,
    template: { template: '' },
    insertion_index
  })
}

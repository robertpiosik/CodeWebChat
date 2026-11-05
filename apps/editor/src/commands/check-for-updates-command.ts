import * as vscode from 'vscode'
import { t } from '../i18n'
import { PromptViewProvider } from '../views/prompt/backend/prompt-view-provider'
import { update_extension } from '../utils/update-extension'

const MINIMUM_WAIT_TIME = 2000

export const check_for_updates_command = (
  prompt_view_provider: PromptViewProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkForUpdates',
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t(
            'command.check-for-updates-command.info.checking-for-updates'
          ),
          cancellable: false
        },
        async () => {
          const start_time = Date.now()
          await prompt_view_provider.check_for_updates({ force: true })
          const elapsed_time = Date.now() - start_time

          if (elapsed_time < MINIMUM_WAIT_TIME) {
            await new Promise((resolve) =>
              setTimeout(resolve, MINIMUM_WAIT_TIME - elapsed_time)
            )
          }
        }
      )

      if (prompt_view_provider.update_info.is_available) {
        const action = await vscode.window.showInformationMessage(
          t('command.check-for-updates-command.info.new-version-available'),
          t('command.check-for-updates-command.action.update')
        )

        if (action === t('command.check-for-updates-command.action.update')) {
          if (prompt_view_provider.update_info.latest_version_tag) {
            update_extension({
              tag_name: prompt_view_provider.update_info.latest_version_tag
            })
          }
        }
      } else {
        vscode.window.showInformationMessage(
          t('command.check-for-updates-command.info.no-updates-available')
        )
      }
    }
  )
}

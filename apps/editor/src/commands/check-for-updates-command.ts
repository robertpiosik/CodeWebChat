import * as vscode from 'vscode'
import { t } from '../i18n'
import { PromptViewProvider } from '../views/prompt/backend/prompt-view-provider'
import { update_extension } from '../utils/update-extension'

export const check_for_updates_command = (
  prompt_view_provider: PromptViewProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkForUpdates',
    async () => {
      await prompt_view_provider.check_for_updates()
      if (prompt_view_provider.update_info.is_available) {
        const action = await vscode.window.showInformationMessage(
          t('command.check-for-updates-command.info.new-version-available'),
          t('command.check-for-updates-command.action.update')
        )

        if (action === t('command.check-for-updates-command.action.update')) {
          if (prompt_view_provider.update_info.latest_version_sha) {
            update_extension({
              commit_sha: prompt_view_provider.update_info.latest_version_sha
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

import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'
import { ProvidersManager } from '@/services/providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { edit_reasoning_effort_for_api_config } from '@/views/shared/actions/api/update/interactions'
import { verify_reasoning_effort } from '@/views/shared/actions/api/create/interactions'
import { t } from '@/i18n'

export const handle_pick_api_reasoning_effort = async (
  provider: SettingsViewProvider,
  message: any
): Promise<void> => {
  const providers_manager = new ProvidersManager(provider.extension_context)
  const new_effort = await edit_reasoning_effort_for_api_config(
    message.current_effort
  )

  if (new_effort === undefined) return

  if (new_effort !== null) {
    let is_valid = true
    const provider_inst = await providers_manager.get_provider(
      message.provider_name
    )

    if (provider_inst && provider_inst.base_url) {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: t(
              'views.settings.handlers.handle-pick-api-reasoning-effort.checking-support'
            ),
            cancellable: true
          },
          async (_progress, token) => {
            await verify_reasoning_effort({
              base_url: provider_inst.base_url!,
              api_key: provider_inst.api_key,
              model: message.model,
              reasoning_effort: new_effort as string,
              provider: provider_inst,
              cancellation_token: token
            })
          }
        )
      } catch (error: any) {
        is_valid = false
        if (error?.message != 'Cancelled') {
          vscode.window.showWarningMessage(
            dictionary.warning_message.REASONING_EFFORT_NOT_SUPPORTED
          )
        }
      }
    }
    if (!is_valid) return
  }

  provider.postMessage({
    command: 'NEWLY_PICKED_API_REASONING_EFFORT',
    effort: new_effort === null ? undefined : (new_effort as string)
  })
}

import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PickApiReasoningEffortMessage } from '@/views/panel/types/messages'
import { edit_reasoning_effort_for_api_config } from '@/views/actions/upsert-api-configuration/interactions'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { verify_reasoning_effort } from '@/views/actions/upsert-api-configuration/interactions/verify-reasoning-effort'

export const handle_pick_api_reasoning_effort = async (
  panel_provider: PanelProvider,
  message: PickApiReasoningEffortMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(panel_provider.context)

  const new_effort = await edit_reasoning_effort_for_api_config(
    message.current_effort
  )

  if (new_effort === undefined) return

  if (new_effort !== null) {
    let is_valid = true
    const model_provider = await providers_manager.get_model_provider(
      message.model_provider_name
    )

    if (model_provider && model_provider.base_url) {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Checking reasoning effort validity...',
            cancellable: true
          },
          async (_progress, token) => {
            await verify_reasoning_effort({
              endpoint_url: model_provider.base_url!,
              api_key: model_provider.api_key,
              model: message.model,
              reasoning_effort: new_effort as string,
              model_provider,
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

  panel_provider.send_message({
    command: 'NEWLY_PICKED_API_REASONING_EFFORT',
    effort: new_effort === null ? undefined : (new_effort as string)
  })
}

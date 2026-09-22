import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { PickApiReasoningEffortMessage } from '@/views/prompt/types/messages'
import { edit_reasoning_effort_for_api_config } from '@/views/shared/actions/api/update/interactions'
import { ProvidersManager } from '@/services/providers-manager'
import { verify_reasoning_effort } from '@/views/shared/actions/api/create/interactions'
import { t } from '@/i18n'

export const handle_pick_api_reasoning_effort = async (
  prompt_view_provider: PromptViewProvider,
  message: PickApiReasoningEffortMessage
): Promise<void> => {
  const providers_manager = new ProvidersManager(
    prompt_view_provider.extension_context
  )

  const new_effort = await edit_reasoning_effort_for_api_config(
    message.current_effort
  )

  if (new_effort === undefined) return

  if (new_effort !== null) {
    let is_valid = true
    const provider = await providers_manager.get_provider(message.provider_name)

    if (provider && provider.base_url) {
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: t('common.progress.checking-reasoning-effort'),
            cancellable: true
          },
          async (_progress, token) => {
            await verify_reasoning_effort({
              base_url: provider.base_url!,
              api_key: provider.api_key,
              model: message.model,
              reasoning_effort: new_effort as string,
              provider,
              cancellation_token: token
            })
          }
        )
      } catch (error) {
        is_valid = false
        const error_msg = error instanceof Error ? error.message : String(error)
        if (error_msg != 'Cancelled') {
          vscode.window.showWarningMessage(
            t('views.common.handlers.common.reasoning-effort-not-supported')
          )
        }
      }
    }
    if (!is_valid) return
  }

  prompt_view_provider.send_message({
    command: 'NEWLY_PICKED_API_REASONING_EFFORT',
    effort: new_effort === null ? undefined : (new_effort as string)
  })
}

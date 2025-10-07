import * as vscode from 'vscode'
import { ViewProvider } from '@/views/panel/backend/view-provider'
import { at_sign_quick_pick } from '@/views/panel/backend/utils/at-sign-quick-pick'

export const handle_at_sign_quick_pick_for_preset_affix = async (
  provider: ViewProvider,
  context: vscode.ExtensionContext,
  message: { is_for_code_completions: boolean }
): Promise<void> => {
  const replacement = await at_sign_quick_pick({
    context,
    is_for_code_completions: message.is_for_code_completions,
    workspace_provider: provider.workspace_provider,
    allow_reference_context_item: false
  })

  if (replacement) {
    provider.send_message({
      command: 'AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX_RESULT',
      text_to_insert: replacement
    })
  }
}

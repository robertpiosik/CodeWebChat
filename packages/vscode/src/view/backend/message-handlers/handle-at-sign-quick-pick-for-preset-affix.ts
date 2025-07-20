import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { at_sign_quick_pick } from '../../../utils/at-sign-quick-pick'

export const handle_at_sign_quick_pick_for_preset_affix = async (
  provider: ViewProvider,
  context: vscode.ExtensionContext,
  message: { is_for_code_completions: boolean }
): Promise<void> => {
  const replacement = await at_sign_quick_pick(
    context,
    message.is_for_code_completions
  )

  if (replacement) {
    provider.send_message({
      command: 'AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX_RESULT',
      text_to_insert: replacement
    })
  }
}

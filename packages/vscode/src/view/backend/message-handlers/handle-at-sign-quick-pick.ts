import { ViewProvider } from '@/view/backend/view-provider'
import { at_sign_quick_pick } from '../../../utils/at-sign-quick-pick'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'
import * as vscode from 'vscode'

export const handle_at_sign_quick_pick = async (
  provider: ViewProvider,
  context: vscode.ExtensionContext
): Promise<void> => {
  const is_in_code_completions_mode =
    (provider.home_view_type == HOME_VIEW_TYPES.WEB &&
      provider.web_mode == 'code-completions') ||
    (provider.home_view_type == HOME_VIEW_TYPES.API &&
      provider.api_mode == 'code-completions')

  const replacement = await at_sign_quick_pick(
    context,
    is_in_code_completions_mode
  )

  if (!replacement) {
    provider.send_message({
      command: 'FOCUS_CHAT_INPUT'
    })
    return
  }

  let current_text = ''

  const mode =
    provider.home_view_type == HOME_VIEW_TYPES.WEB
      ? provider.web_mode
      : provider.api_mode
  if (mode == 'ask') {
    current_text = provider.ask_instructions
  } else if (mode == 'edit-context') {
    current_text = provider.edit_instructions
  } else if (mode == 'no-context') {
    current_text = provider.no_context_instructions
  } else if (mode == 'code-completions') {
    current_text = provider.code_completion_instructions
  }

  const is_after_at_sign = current_text
    .slice(0, provider.caret_position)
    .endsWith('@')
  const text_to_insert = is_after_at_sign ? replacement : `@${replacement}`
  provider.add_text_at_cursor_position(text_to_insert)
}

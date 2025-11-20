import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { MODE } from '@/views/panel/types/home-view-type'
import * as vscode from 'vscode'
import { hash_sign_quick_pick } from '../utils/hash-sign-quick-pick'

export const handle_hash_sign_quick_pick = async (
  panel_provider: PanelProvider,
  context: vscode.ExtensionContext,
  is_for_code_completions: boolean
): Promise<void> => {
  const replacement = await hash_sign_quick_pick({
    context,
    is_for_code_completions
  })

  if (!replacement) {
    panel_provider.send_message({
      command: 'FOCUS_PROMPT_FIELD'
    })
    return
  }

  let current_text = ''

  const mode =
    panel_provider.mode == MODE.WEB
      ? panel_provider.web_prompt_type
      : panel_provider.api_prompt_type
  if (mode == 'ask') {
    current_text = panel_provider.ask_instructions
  } else if (mode == 'edit-context') {
    current_text = panel_provider.edit_instructions
  } else if (mode == 'no-context') {
    current_text = panel_provider.no_context_instructions
  } else if (mode == 'code-completions') {
    current_text = panel_provider.code_completion_instructions
  }

  const is_after_hash_sign = current_text
    .slice(0, panel_provider.caret_position)
    .endsWith('#')
  if (is_after_hash_sign) {
    panel_provider.add_text_at_cursor_position(replacement, 1)
  } else {
    panel_provider.add_text_at_cursor_position(replacement)
  }
}

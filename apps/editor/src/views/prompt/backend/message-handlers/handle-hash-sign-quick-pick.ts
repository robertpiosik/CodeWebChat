import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { hash_sign_quick_pick } from '@/views/shared/utils/hash-sign-quick-pick'

export const handle_hash_sign_quick_pick = async (
  prompt_view_provider: PromptViewProvider,
  extension_context: vscode.ExtensionContext
): Promise<void> => {
  let first_insert = true

  const on_insert = (replacement: string) => {
    if (first_insert) {
      const current_text = prompt_view_provider.current_instructions
      const is_after_hash_sign = current_text
        .slice(0, prompt_view_provider.caret_position)
        .endsWith('#')
      if (is_after_hash_sign) {
        prompt_view_provider.add_text_at_cursor_position(replacement, 1)
      } else {
        prompt_view_provider.add_text_at_cursor_position(replacement)
      }
      first_insert = false
    } else {
      prompt_view_provider.add_text_at_cursor_position(replacement)
    }
  }

  const replacement = await hash_sign_quick_pick({
    extension_context,
    on_insert
  })

  if (replacement) {
    on_insert(replacement)
  }

  prompt_view_provider.send_message({
    command: 'FOCUS_PROMPT_FIELD'
  })
}

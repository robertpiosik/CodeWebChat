import { MainViewProvider } from '@/views/main/backend/view-provider'
import { at_sign_quick_pick } from '../../../../utils/at-sign-quick-pick'

export const handle_at_sign_quick_pick = async (
  provider: MainViewProvider
): Promise<void> => {
  const replacement = await at_sign_quick_pick()

  if (!replacement) {
    return
  }

  const current_text = provider.instructions
  const is_after_at_sign = current_text
    .slice(0, provider.caret_position)
    .endsWith('@')
  const text_to_insert = is_after_at_sign ? replacement : `@${replacement}`
  provider.add_text_at_cursor_position(text_to_insert)
}

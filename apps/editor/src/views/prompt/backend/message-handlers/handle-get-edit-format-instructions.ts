import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { EditFormat } from '@shared/types/edit-format'
import {
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

export const handle_get_edit_format_instructions = (
  prompt_view_provider: PromptViewProvider
) => {
  const instructions: Record<EditFormat, string> = {
    whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
    truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
    'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
    diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
  }
  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT_INSTRUCTIONS',
    instructions
  })
}

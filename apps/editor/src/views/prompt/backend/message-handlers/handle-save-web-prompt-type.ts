import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WebPromptType } from '@shared/types/prompt-types'

export const handle_save_web_prompt_type = async (
  prompt_view_provider: PromptViewProvider,
  prompt_type: WebPromptType
): Promise<void> => {
  prompt_view_provider.web_prompt_type = prompt_type
  await prompt_view_provider.extension_context.workspaceState.update(
    'web-mode',
    prompt_type
  )
}

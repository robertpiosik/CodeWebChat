import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { ApiPromptType } from '@shared/types/prompt-types'

export const handle_save_api_prompt_type = async (
  prompt_view_provider: PromptViewProvider,
  prompt_type: ApiPromptType
): Promise<void> => {
  prompt_view_provider.api_prompt_type = prompt_type
  await prompt_view_provider.extension_context.workspaceState.update(
    'api-mode',
    prompt_type
  )
}

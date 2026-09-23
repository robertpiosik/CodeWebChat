import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { CliPromptType } from '@shared/types/prompt-types'
import { CLI_TARGET_STATE_KEY } from '@/constants/state-keys'

export const handle_save_cli_prompt_type = async (
  prompt_view_provider: PromptViewProvider,
  prompt_type: CliPromptType
): Promise<void> => {
  prompt_view_provider.cli_prompt_type = prompt_type
  await prompt_view_provider.extension_context.workspaceState.update(
    CLI_TARGET_STATE_KEY,
    prompt_type
  )
}

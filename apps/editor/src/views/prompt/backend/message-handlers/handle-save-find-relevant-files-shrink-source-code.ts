import { PromptViewProvider } from '../prompt-view-provider'
import { FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY } from '@/constants/state-keys'

export const handle_save_find_relevant_files_shrink_source_code = async (
  prompt_view_provider: PromptViewProvider,
  shrink_source_code: boolean
) => {
  await prompt_view_provider.extension_context.workspaceState.update(
    FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
    shrink_source_code
  )
  prompt_view_provider.update_providers_shrink_mode()
}

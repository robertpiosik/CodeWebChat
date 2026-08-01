import { PromptViewProvider } from '../prompt-view-provider'
import { FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY } from '@/constants/state-keys'

export const handle_get_find_relevant_files_shrink_source_code = (
  prompt_view_provider: PromptViewProvider
) => {
  const shrink_source_code =
    prompt_view_provider.extension_context.workspaceState.get<boolean>(
      FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
      false
    )

  prompt_view_provider.send_message({
    command: 'FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE',
    shrink_source_code
  })
}

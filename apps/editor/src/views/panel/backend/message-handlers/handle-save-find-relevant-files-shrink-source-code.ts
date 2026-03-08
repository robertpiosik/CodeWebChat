import { PanelProvider } from '../panel-provider'
import { FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY } from '@/constants/state-keys'

export const handle_save_find_relevant_files_shrink_source_code = async (
  panel_provider: PanelProvider,
  shrink_source_code: boolean
) => {
  await panel_provider.context.workspaceState.update(
    FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
    shrink_source_code
  )
  panel_provider.update_providers_shrink_mode()
}

import { PanelViewProvider } from '../panel-view-provider'
import { FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY } from '@/constants/state-keys'

export const handle_save_find_relevant_files_shrink_source_code = async (
  panel_view_provider: PanelViewProvider,
  shrink_source_code: boolean
) => {
  await panel_view_provider.extension_context.workspaceState.update(
    FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
    shrink_source_code
  )
  panel_view_provider.update_providers_shrink_mode()
}

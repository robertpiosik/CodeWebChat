import { PanelProvider } from '../panel-provider'
import { FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY } from '@/constants/state-keys'

export const handle_get_find_relevant_files_shrink_source_code = (
  panel_provider: PanelProvider
) => {
  const shrink_source_code = panel_provider.context.workspaceState.get<boolean>(
    FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
    false
  )

  panel_provider.send_message({
    command: 'FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE',
    shrink_source_code
  })
}

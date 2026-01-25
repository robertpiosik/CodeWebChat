import { PanelProvider } from '@/views/panel/backend/panel-provider'

import { CancelIntelligentUpdateFileInPreviewMessage } from '@/views/panel/types/messages'

export const handle_cancel_intelligent_update_file_in_preview = (
  panel_provider: PanelProvider,

  message: CancelIntelligentUpdateFileInPreviewMessage
) => {
  const { file_path, workspace_name } = message

  const source_index =
    panel_provider.intelligent_update_cancel_token_sources.findIndex(
      (s) => s.file_path === file_path && s.workspace_name === workspace_name
    )

  if (source_index > -1) {
    const { source } =
      panel_provider.intelligent_update_cancel_token_sources[source_index]

    source.cancel('User cancelled the operation')

    panel_provider.intelligent_update_cancel_token_sources.splice(
      source_index,

      1
    )
  }
}

import { PanelProvider } from '@/views/panel/backend/panel-provider'

import { CancelIntelligentUpdateFileInPreviewMessage } from '@/views/panel/types/messages'

export const handle_cancel_intelligent_update_file_in_preview = (
  panel_provider: PanelProvider,

  message: CancelIntelligentUpdateFileInPreviewMessage
) => {
  const { file_path, workspace_name } = message

  const source_index =
    panel_provider.intelligent_update_abort_controllers.findIndex(
      (s) => s.file_path === file_path && s.workspace_name === workspace_name
    )

  if (source_index > -1) {
    const { controller } =
      panel_provider.intelligent_update_abort_controllers[source_index]

    controller.abort('User cancelled the operation')

    panel_provider.intelligent_update_abort_controllers.splice(
      source_index,

      1
    )
  }
}

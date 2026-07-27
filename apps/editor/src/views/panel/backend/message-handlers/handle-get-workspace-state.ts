import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_workspace_state = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'WORKSPACE_STATE',
    folder_count:
      panel_view_provider.workspace_provider.get_workspace_roots().length
  })
}

import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_workspace_state = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'WORKSPACE_STATE',
    folder_count: panel_provider.workspace_provider.get_workspace_roots().length
  })
}

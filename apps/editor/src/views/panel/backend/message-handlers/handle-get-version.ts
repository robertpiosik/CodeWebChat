import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_version = (panel_view_provider: PanelViewProvider) => {
  panel_view_provider.send_message({
    command: 'VERSION',
    version: panel_view_provider.extension_context.extension.packageJSON.version
  })
}

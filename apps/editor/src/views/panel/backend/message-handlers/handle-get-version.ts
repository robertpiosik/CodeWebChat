import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_version = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'VERSION',
    version: panel_provider.context.extension.packageJSON.version
  })
}

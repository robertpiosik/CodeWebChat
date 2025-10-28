import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_version = (provider: PanelProvider): void => {
  provider.send_message({
    command: 'VERSION',
    version: provider.context.extension.packageJSON.version
  })
}

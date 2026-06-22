import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { DuplicateWebConfigurationMessage } from '@/views/panel/types/messages'
import { duplicate_web_configuration } from '@/views/utils/duplicate-web-configuration'
export const handle_duplicate_web_configuration = async (
  panel_provider: PanelProvider,
  message: DuplicateWebConfigurationMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  await duplicate_web_configuration({ index: message.index })
  panel_provider.send_web_configurations_to_webview(webview_view.webview)
}

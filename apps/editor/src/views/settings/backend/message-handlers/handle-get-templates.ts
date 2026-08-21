import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_templates = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  provider.postMessage({
    command: 'TEMPLATES',
    templates: {
      templatesForEditFiles: config.get('templatesForEditFiles', []),
      templatesForAskAboutFiles: config.get('templatesForAskAboutFiles', [])
    }
  })
}

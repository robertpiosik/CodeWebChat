import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_prompt_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')

  const map_templates = (items: any[]) =>
    items.map((i) => ({ name: i.name, value: i.template }))
  const map_instructions = (items: any[]) =>
    items.map((i) => ({ name: i.name, value: i.instruction }))

  provider.postMessage({
    command: 'PROMPT_INSTRUCTIONS',
    prompt_instructions: {
      templatesForEditFiles: map_templates(
        config.get('templatesForEditFiles', [])
      ),
      templatesForAskAboutFiles: map_templates(
        config.get('templatesForAskAboutFiles', [])
      ),
      snippetsForEditFiles: map_instructions(
        config.get('snippetsForEditFiles', [])
      ),
      snippetsForAskAboutFiles: map_instructions(
        config.get('snippetsForAskAboutFiles', [])
      )
    }
  })
}

import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { AGENTS } from '@/constants/agents'
import { config_cli_configuration_to_ui_format } from '@/utils/cli-configuration-format-converters'

export const handle_get_cli_configurations = async (
  settings_provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const cli_configurations_config = config.get<any[]>('agents', []) || []

  settings_provider.postMessage({
    command: 'CLI_CONFIGURATIONS',
    cli_configurations: cli_configurations_config
      .filter((c: any) => c.agent && AGENTS[c.agent as keyof typeof AGENTS])
      .map((config: any) => {
        return config_cli_configuration_to_ui_format(config)
      }),
    defaults: {
      'agentic-search':
        cli_configurations_config.find((c: any) => c.isDefaultForAgenticSearch)
          ?.name || null,
      'code-at-cursor':
        cli_configurations_config.find((c: any) => c.isDefaultForCodeAtCursor)
          ?.name || null,
      'intelligent-search':
        cli_configurations_config.find(
          (c: any) => c.isDefaultForIntelligentSearch
        )?.name || null,
      'patch-repair':
        cli_configurations_config.find((c: any) => c.isDefaultForPatchRepair)
          ?.name || null,
      'voice-input':
        cli_configurations_config.find((c: any) => c.isDefaultForVoiceInput)
          ?.name || null,
      'commit-message':
        cli_configurations_config.find((c: any) => c.isDefaultForCommitMessage)
          ?.name || null
    }
  })
}

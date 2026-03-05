import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_extended_cache_duration_for_anthropic = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>(
    'extendedCacheDurationForAnthropic',
    false
  )
  provider.postMessage({
    command: 'EXTENDED_CACHE_DURATION_FOR_ANTHROPIC',
    enabled
  })
}

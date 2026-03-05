import * as vscode from 'vscode'
import { UpdateExtendedCacheDurationForAnthropicMessage } from '@/views/settings/types/messages'

export const handle_update_extended_cache_duration_for_anthropic = async (
  message: UpdateExtendedCacheDurationForAnthropicMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'extendedCacheDurationForAnthropic',
      message.enabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}

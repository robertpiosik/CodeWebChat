import * as vscode from 'vscode'
import { ProvidersManager } from '../../../services/providers-manager'
import { LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { get_api_configuration } from '@/utils/get-api-configuration'

export const get_code_at_cursor_api_configuration = async (params: {
  providers_manager: ProvidersManager
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
  api_configuration_id?: string
}): Promise<{ provider: any; api_configuration: any } | undefined> => {
  const result = await get_api_configuration({
    providers_manager: params.providers_manager,
    show_quick_pick: params.show_quick_pick,
    extension_context: params.extension_context,
    api_configuration_id: params.api_configuration_id,
    last_used_state_key: LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY,
    default_api_configuration:
      await params.providers_manager.get_default_code_at_cursor_api_configuration(),
    caller_name: 'get_code_at_cursor_api_configuration'
  })

  if (!result || result === 'back') {
    return undefined
  }

  return {
    provider: result.provider,
    api_configuration: result.api_configuration
  }
}

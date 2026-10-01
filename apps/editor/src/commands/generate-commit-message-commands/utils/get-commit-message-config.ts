import * as vscode from 'vscode'
import { ProvidersManager } from '@/services/providers-manager'
import { LAST_USED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { get_api_configuration } from '@/utils/get-api-configuration'

export interface CommitMessageApiConfiguration {
  provider_name: string
  model: string
  reasoning_effort?: string
}

export const get_commit_message_api_configuration = async (params: {
  extension_context: vscode.ExtensionContext
  show_back_button?: boolean
  show_quick_pick?: boolean
}): Promise<
  | {
      api_configuration: CommitMessageApiConfiguration
      provider: any
      base_url: string
    }
  | 'back'
  | null
> => {
  const providers_manager = new ProvidersManager(params.extension_context)
  const show_quick_pick = params.show_quick_pick ?? false
  const show_back_button = params.show_back_button ?? true

  const result = await get_api_configuration({
    providers_manager,
    extension_context: params.extension_context,
    show_quick_pick,
    last_used_state_key: LAST_USED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY,
    show_back_button,
    ignore_focus_out: true,
    caller_name: 'get_commit_message_api_configuration',
    auto_select_last_used: false,
    default_api_configuration:
      await providers_manager.get_default_commit_message_api_configuration()
  })

  if (result === 'back') {
    return 'back'
  }

  if (!result) {
    return null
  }

  return {
    api_configuration: result.api_configuration,
    provider: result.provider,
    base_url: result.provider.base_url
  }
}

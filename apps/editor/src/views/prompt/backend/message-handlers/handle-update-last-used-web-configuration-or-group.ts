import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { get_last_used_web_configuration_key } from '@/constants/state-keys'

export const handle_update_last_used_web_configuration_or_group = (params: {
  prompt_view_provider: PromptViewProvider
  web_configuration_name?: string
}) => {
  const name_to_save = params.web_configuration_name

  if (name_to_save) {
    const recents_key = get_last_used_web_configuration_key(
      params.prompt_view_provider.web_prompt_type
    )

    const new_recents = name_to_save

    params.prompt_view_provider.extension_context.workspaceState.update(
      recents_key,
      new_recents
    )
    params.prompt_view_provider.extension_context.globalState.update(
      recents_key,
      new_recents
    )

    params.prompt_view_provider.send_message({
      command: 'SELECTED_WEB_CONFIGURATION_CHANGED',
      prompt_type: params.prompt_view_provider.web_prompt_type,
      name: name_to_save
    })
  }
}

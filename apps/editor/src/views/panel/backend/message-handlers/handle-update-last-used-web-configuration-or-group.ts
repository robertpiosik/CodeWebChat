import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { get_last_used_web_configuration_key } from '@/constants/state-keys'

export const handle_update_last_used_web_configuration_or_group = (params: {
  panel_provider: PanelProvider
  web_configuration_name?: string
}) => {
  const name_to_save = params.web_configuration_name

  if (name_to_save) {
    const recents_key = get_last_used_web_configuration_key(
      params.panel_provider.web_prompt_type
    )

    const new_recents = name_to_save

    params.panel_provider.extension_context.workspaceState.update(
      recents_key,
      new_recents
    )
    params.panel_provider.extension_context.globalState.update(
      recents_key,
      new_recents
    )

    params.panel_provider.send_message({
      command: 'SELECTED_WEB_CONFIGURATION_CHANGED',
      prompt_type: params.panel_provider.web_prompt_type,
      name: name_to_save
    })
  }
}

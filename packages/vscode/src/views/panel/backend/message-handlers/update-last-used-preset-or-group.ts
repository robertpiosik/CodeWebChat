import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { get_last_selected_preset_or_group_key } from '@/constants/state-keys'

export const update_last_used_preset_or_group = (params: {
  panel_provider: PanelProvider
  preset_name?: string
  group_name?: string
}) => {
  if (params.preset_name !== undefined) {
    const key = get_last_selected_preset_or_group_key(
      params.panel_provider.web_prompt_type
    )
    params.panel_provider.context.workspaceState.update(key, params.preset_name)
    params.panel_provider.context.globalState.update(key, params.preset_name)
    params.panel_provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: params.panel_provider.web_prompt_type,
      name: params.preset_name
    })
  } else if (params.group_name) {
    const key = get_last_selected_preset_or_group_key(
      params.panel_provider.web_prompt_type
    )
    params.panel_provider.context.workspaceState.update(key, params.group_name)
    params.panel_provider.context.globalState.update(key, params.group_name)
    params.panel_provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: params.panel_provider.web_prompt_type,
      name: params.group_name
    })
  }
}

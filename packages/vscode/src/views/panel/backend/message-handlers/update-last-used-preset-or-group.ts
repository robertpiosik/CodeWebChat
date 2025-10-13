import { ViewProvider } from '@/views/panel/backend/panel-provider'
import {
  get_last_group_or_preset_choice_state_key,
  get_last_selected_group_state_key,
  get_last_selected_preset_key
} from '@/constants/state-keys'

export const update_last_used_preset_or_group = (params: {
  provider: ViewProvider
  preset_name?: string
  group_name?: string
}) => {
  if (params.preset_name !== undefined) {
    const choice_key = get_last_group_or_preset_choice_state_key(
      params.provider.web_mode
    )
    params.provider.context.workspaceState.update(choice_key, 'Preset')
    params.provider.context.globalState.update(choice_key, 'Preset')
    const preset_key = get_last_selected_preset_key(params.provider.web_mode)
    params.provider.context.workspaceState.update(
      preset_key,
      params.preset_name
    )
    params.provider.context.globalState.update(preset_key, params.preset_name)
    params.provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: params.provider.web_mode,
      name: params.preset_name
    })
  } else if (params.group_name) {
    const choice_key = get_last_group_or_preset_choice_state_key(
      params.provider.web_mode
    )
    params.provider.context.workspaceState.update(choice_key, 'Group')
    params.provider.context.globalState.update(choice_key, 'Group')
    const group_key = get_last_selected_group_state_key(
      params.provider.web_mode
    )
    params.provider.context.workspaceState.update(group_key, params.group_name)
    params.provider.context.globalState.update(group_key, params.group_name)
    params.provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: params.provider.web_mode,
      name: params.group_name
    })
  }
}

import { ViewProvider } from '@/view/backend/view-provider'
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
    params.provider.context.workspaceState.update(
      get_last_group_or_preset_choice_state_key(params.provider.web_mode),
      'Preset'
    )
    params.provider.context.workspaceState.update(
      get_last_selected_preset_key(params.provider.web_mode),
      params.preset_name
    )
    params.provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: params.provider.web_mode,
      name: params.preset_name
    })
  } else if (params.group_name) {
    params.provider.context.workspaceState.update(
      get_last_group_or_preset_choice_state_key(params.provider.web_mode),
      'Group'
    )
    params.provider.context.workspaceState.update(
      get_last_selected_group_state_key(params.provider.web_mode),
      params.group_name
    )
    params.provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: params.provider.web_mode,
      name: params.group_name
    })
  }
}

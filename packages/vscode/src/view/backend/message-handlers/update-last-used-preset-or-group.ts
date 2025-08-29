import { ViewProvider } from '@/view/backend/view-provider'
import {
  get_last_group_or_preset_choice_state_key,
  get_last_selected_group_state_key,
  get_last_selected_preset_key
} from '@/constants/state-keys'

export const update_last_used_preset_or_group = (
  provider: ViewProvider,
  preset_name?: string,
  group_name?: string
) => {
  if (preset_name !== undefined) {
    provider.context.workspaceState.update(
      get_last_group_or_preset_choice_state_key(provider.web_mode),
      'Preset'
    )
    provider.context.workspaceState.update(
      get_last_selected_preset_key(provider.web_mode),
      preset_name
    )
    provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: provider.web_mode,
      name: preset_name
    })
  } else if (group_name) {
    provider.context.workspaceState.update(
      get_last_group_or_preset_choice_state_key(provider.web_mode),
      'Group'
    )
    provider.context.workspaceState.update(
      get_last_selected_group_state_key(provider.web_mode),
      group_name
    )
    provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: provider.web_mode,
      name: group_name
    })
  }
}

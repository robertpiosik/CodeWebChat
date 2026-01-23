import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { get_recently_used_presets_or_groups_key } from '@/constants/state-keys'

export const update_last_used_preset_or_group = (params: {
  panel_provider: PanelProvider
  preset_name?: string
  group_name?: string
}) => {
  const name_to_save = params.preset_name ?? params.group_name

  if (name_to_save) {
    const recents_key = get_recently_used_presets_or_groups_key(
      params.panel_provider.web_prompt_type
    )
    const recents =
      params.panel_provider.context.workspaceState.get<string[]>(recents_key) ??
      params.panel_provider.context.globalState.get<string[]>(recents_key, [])

    const new_recents = [
      name_to_save,
      ...recents.filter((r) => r != name_to_save)
    ].slice(0, 10)

    params.panel_provider.context.workspaceState.update(
      recents_key,
      new_recents
    )
    params.panel_provider.context.globalState.update(recents_key, new_recents)

    params.panel_provider.send_message({
      command: 'SELECTED_PRESET_OR_GROUP_CHANGED',
      mode: params.panel_provider.web_prompt_type,
      name: name_to_save
    })
  }
}

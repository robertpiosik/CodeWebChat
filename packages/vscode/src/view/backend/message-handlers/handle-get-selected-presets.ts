import { ViewProvider } from '@/view/backend/view-provider'

export const handle_get_selected_presets = (provider: ViewProvider): void => {
  const state_key = provider.get_selected_presets_state_key()
  const selected_names =
    provider.context.globalState.get<string[]>(state_key, [])
  provider.send_message({
    command: 'SELECTED_PRESETS',
    names: selected_names
  })
}

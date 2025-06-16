import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_selected_presets = (provider: MainViewProvider): void => {
  const selected_names = provider.context.globalState.get<string[]>(
    'selectedPresets',
    []
  )
  provider.send_message<ExtensionMessage>({
    command: 'SELECTED_PRESETS',
    names: selected_names
  })
}

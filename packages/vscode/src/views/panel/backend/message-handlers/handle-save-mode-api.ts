import { ViewProvider } from '@/views/panel/backend/view-provider'
import { ApiMode } from '@shared/types/modes'

export const handle_save_mode_api = async (
  provider: ViewProvider,
  mode: ApiMode
): Promise<void> => {
  provider.api_mode = mode
  await provider.context.workspaceState.update('api-mode', mode)
}

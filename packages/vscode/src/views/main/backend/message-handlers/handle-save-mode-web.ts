import { MainViewProvider } from '@/views/main/backend/view-provider'
import { WebMode } from '@shared/types/modes'

export const handle_save_mode_web = async (
  provider: MainViewProvider,
  mode: WebMode
): Promise<void> => {
  provider.web_mode = mode
  await provider.context.workspaceState.update('web-mode', mode)
}

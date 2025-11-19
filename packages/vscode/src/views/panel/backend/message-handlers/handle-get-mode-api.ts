import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_mode_api = (panel_provider: PanelProvider): void => {
  panel_provider.send_message({
    command: 'API_PROMPT_TYPE',
    mode: panel_provider.api_prompt_type
  })
}

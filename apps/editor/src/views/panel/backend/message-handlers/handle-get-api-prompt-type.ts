import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_api_prompt_type = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'API_PROMPT_TYPE',
    prompt_type: panel_provider.api_prompt_type
  })
}

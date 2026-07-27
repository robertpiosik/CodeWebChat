import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_api_prompt_type = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'API_PROMPT_TYPE',
    prompt_type: panel_view_provider.api_prompt_type
  })
}

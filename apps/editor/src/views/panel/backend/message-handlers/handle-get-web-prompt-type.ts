import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_web_prompt_type = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'WEB_PROMPT_TYPE',
    prompt_type: panel_view_provider.web_prompt_type
  })
}

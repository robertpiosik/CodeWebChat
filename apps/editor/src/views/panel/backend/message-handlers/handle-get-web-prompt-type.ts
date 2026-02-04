import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_web_prompt_type = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'WEB_PROMPT_TYPE',
    prompt_type: panel_provider.web_prompt_type
  })
}

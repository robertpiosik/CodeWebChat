import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { update_last_used_web_configuration } from '../utils/update-last-used-web-configuration'

export const handle_update_last_used_web_configuration = (params: {
  prompt_view_provider: PromptViewProvider
  web_configuration_name?: string
}) => {
  update_last_used_web_configuration(params)
}
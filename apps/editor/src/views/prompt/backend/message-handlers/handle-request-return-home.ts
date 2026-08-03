import { PromptViewProvider } from '../prompt-view-provider'

export const handle_request_return_home = async (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({ command: 'RETURN_HOME' })
}

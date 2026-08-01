import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_version = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'VERSION',
    version:
      prompt_view_provider.extension_context.extension.packageJSON.version
  })
}

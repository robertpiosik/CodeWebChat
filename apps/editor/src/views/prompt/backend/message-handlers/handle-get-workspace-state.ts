import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_workspace_state = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'WORKSPACE_STATE',
    folder_count:
      prompt_view_provider.workspace_provider.get_workspace_roots().length
  })
}

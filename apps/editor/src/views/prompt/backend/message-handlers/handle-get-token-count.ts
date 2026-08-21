import { PromptViewProvider } from '../prompt-view-provider'

export const handle_get_token_count = async (
  prompt_view_provider: PromptViewProvider
) => {
  const token_counts =
    await prompt_view_provider.workspace_provider.get_checked_files_token_count()
  const context_token_count = token_counts.total

  prompt_view_provider.send_message({
    command: 'TOKEN_COUNT_UPDATED',
    token_count: context_token_count
  })
}

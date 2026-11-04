import { update_extension } from '@/utils/update-extension'
import { PromptViewProvider } from '../prompt-view-provider'

export const handle_update_extension = (
  prompt_view_provider: PromptViewProvider
) => {
  if (prompt_view_provider.update_info.latest_version_sha) {
    update_extension({
      commit_sha: prompt_view_provider.update_info.latest_version_sha
    })
  }
}

import { update_extension } from '@/utils/update-extension'
import { PromptViewProvider } from '../prompt-view-provider'

export const handle_update_extension = (
  prompt_view_provider: PromptViewProvider
) => {
  if (prompt_view_provider.is_updating) {
    return
  }

  if (prompt_view_provider.update_info.latest_version_tag) {
    prompt_view_provider.is_updating = true
    prompt_view_provider.send_message({
      command: 'UPDATE_INFO',
      update_info: {
        ...prompt_view_provider.update_info,
        is_updating: true
      }
    })
    update_extension({
      tag_name: prompt_view_provider.update_info.latest_version_tag
    })
  }
}

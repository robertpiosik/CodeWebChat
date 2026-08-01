import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { ReorderApiConfigurationsMessage } from '@/views/prompt/types/messages'
import { reorder } from '@/views/shared/actions/api/reorder'

export const handle_reorder_api_configurations = async (
  prompt_view_provider: PromptViewProvider,
  message: ReorderApiConfigurationsMessage
): Promise<void> => {
  const reordered_ids = message.configurations.map((p) => p.id)
  await reorder({
    extension_context: prompt_view_provider.extension_context,
    reordered_ids
  })
}

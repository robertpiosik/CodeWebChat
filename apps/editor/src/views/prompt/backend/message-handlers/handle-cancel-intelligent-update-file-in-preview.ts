import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

import { CancelIntelligentUpdateFileInPreviewMessage } from '@/views/prompt/types/messages'

export const handle_cancel_intelligent_update_file_in_preview = (
  prompt_view_provider: PromptViewProvider,

  message: CancelIntelligentUpdateFileInPreviewMessage
) => {
  const { file_path, workspace_name } = message

  const source_index =
    prompt_view_provider.intelligent_update_abort_controllers.findIndex(
      (s) => s.file_path === file_path && s.workspace_name === workspace_name
    )

  if (source_index > -1) {
    const { controller } =
      prompt_view_provider.intelligent_update_abort_controllers[source_index]

    controller.abort('User cancelled the operation')

    prompt_view_provider.intelligent_update_abort_controllers.splice(
      source_index,

      1
    )
  }
}

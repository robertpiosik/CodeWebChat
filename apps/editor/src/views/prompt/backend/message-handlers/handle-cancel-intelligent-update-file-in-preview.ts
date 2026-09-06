import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

import { CancelPatchRepairFileInPreviewMessage } from '@/views/prompt/types/messages'

export const handle_cancel_patch_repair_file_in_preview = (
  prompt_view_provider: PromptViewProvider,

  message: CancelPatchRepairFileInPreviewMessage
) => {
  const { file_path, workspace_name } = message

  const source_index =
    prompt_view_provider.patch_repair_abort_controllers.findIndex(
      (s) => s.file_path === file_path && s.workspace_name === workspace_name
    )

  if (source_index > -1) {
    const { controller } =
      prompt_view_provider.patch_repair_abort_controllers[source_index]

    controller.abort('User cancelled the operation')

    prompt_view_provider.patch_repair_abort_controllers.splice(
      source_index,

      1
    )
  }
}

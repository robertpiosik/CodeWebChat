import * as vscode from 'vscode'
import { get_edit_format_state_key } from '@/constants/state-keys'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { SaveEditFormatMessage } from '@/views/prompt/types/messages'
import { TARGET } from '@shared/types/mode'

export const handle_save_edit_format = async (
  prompt_view_provider: PromptViewProvider,
  message: SaveEditFormatMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const synchronize = config.get<boolean>(
    'synchronizeEditFormatBetweenTargets',
    true
  )

  prompt_view_provider.edit_format = message.edit_format

  if (synchronize) {
    prompt_view_provider.web_edit_format = message.edit_format
    prompt_view_provider.api_edit_format = message.edit_format
    await Promise.all([
      prompt_view_provider.extension_context.workspaceState.update(
        get_edit_format_state_key(TARGET.WEB),
        message.edit_format
      ),
      prompt_view_provider.extension_context.globalState.update(
        get_edit_format_state_key(TARGET.WEB),
        message.edit_format
      ),
      prompt_view_provider.extension_context.workspaceState.update(
        get_edit_format_state_key(TARGET.API),
        message.edit_format
      ),
      prompt_view_provider.extension_context.globalState.update(
        get_edit_format_state_key(TARGET.API),
        message.edit_format
      )
    ])
  } else {
    await prompt_view_provider.extension_context.workspaceState.update(
      get_edit_format_state_key(prompt_view_provider.target),
      message.edit_format
    )
    await prompt_view_provider.extension_context.globalState.update(
      get_edit_format_state_key(prompt_view_provider.target),
      message.edit_format
    )
  }

  prompt_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: prompt_view_provider.edit_format
  })
}

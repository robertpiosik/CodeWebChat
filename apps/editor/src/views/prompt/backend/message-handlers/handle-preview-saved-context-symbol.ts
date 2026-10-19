import * as vscode from 'vscode'
import { replace_saved_context_symbol } from '../utils/symbols/saved-context/replace-saved-context-symbol'
import { preview_text_in_temp_file } from '../utils/preview-text-in-temp-file'
import { PromptViewProvider } from '../prompt-view-provider'

export const handle_preview_saved_context_symbol = async (params: {
  prompt_view_provider: PromptViewProvider
  message: { context_type: string; context_name: string }
}) => {
  try {
    const instruction = `#SavedContext(${params.message.context_type} "${params.message.context_name}")`
    const { context_definitions } = await replace_saved_context_symbol({
      instructions: [instruction],
      extension_context: params.prompt_view_provider.extension_context,
      workspace_provider: params.prompt_view_provider.workspace_provider
    })

    if (context_definitions) {
      await preview_text_in_temp_file({
        prefix: 'cwc-context',
        content: context_definitions.trim(),
        extension: '.md'
      })
    } else {
      vscode.window.showInformationMessage(
        'Failed to generate context preview.'
      )
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to preview context: ${error}`)
  }
}

import * as vscode from 'vscode'
import { UpdateAgenticSearchInstructionsMessage } from '../../types/messages'

export const handle_update_agentic_search_instructions = async (
  message: UpdateAgenticSearchInstructionsMessage
) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const default_instructions = config.inspect<string>(
    'agenticSearchInstructions'
  )?.defaultValue
  const value_to_set =
    message.instructions === default_instructions
      ? undefined
      : message.instructions

  await config.update(
    'agenticSearchInstructions',
    value_to_set,
    vscode.ConfigurationTarget.Global
  )
}

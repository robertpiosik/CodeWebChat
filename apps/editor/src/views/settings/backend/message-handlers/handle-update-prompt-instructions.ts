import * as vscode from 'vscode'
import { UpdatePromptInstructionsMessage } from '@/views/settings/types/messages'

export const handle_update_prompt_instructions = async (
  message: UpdatePromptInstructionsMessage
): Promise<void> => {
  const is_template = message.key.startsWith('templates')

  const mapped_items = message.instructions.map((i) => {
    if (is_template) {
      return { name: i.name, template: i.value }
    } else {
      return { name: i.name, instruction: i.value }
    }
  })

  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(message.key, mapped_items, vscode.ConfigurationTarget.Global)
}

import * as vscode from 'vscode'
import { ApplyResponseFromHistoryMessage } from '@/views/prompt/types/messages'

export const handle_apply_response_from_history = async (
  message: ApplyResponseFromHistoryMessage
): Promise<void> => {
  await vscode.commands.executeCommand('codeWebChat.applyResponse', {
    response: message.response,
    raw_instructions: message.raw_instructions,
    files_with_content: message.files,
    created_at: message.created_at,
    api_configuration_details: message.api_configuration_details,
    cli_configuration_details: message.cli_configuration_details,
    web_configuration_details: message.web_configuration_details,
    is_from_agentic_cli: message.is_from_agentic_cli
  })
}

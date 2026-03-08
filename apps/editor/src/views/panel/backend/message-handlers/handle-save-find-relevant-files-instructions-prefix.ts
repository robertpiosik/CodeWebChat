import { find_relevant_files_instructions_prefix } from '@/constants/instructions'
import * as vscode from 'vscode'

export const handle_save_find_relevant_files_instructions_prefix = async (
  prefix: string
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'findRelevantFilesInstructionsPrefix',
    prefix && prefix != find_relevant_files_instructions_prefix
      ? prefix
      : undefined,
    vscode.ConfigurationTarget.Global
  )
}

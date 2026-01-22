import * as vscode from 'vscode'

export const handle_save_prune_context_instructions_prefix = async (
  prefix: string
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update('pruneContextInstructionsPrefix', prefix)
}

import * as vscode from 'vscode'
import { UpdateAutoRunPatchRepairMessage } from '@/views/settings/types/messages'

export const handle_update_auto_run_patch_repair = async (
  message: UpdateAutoRunPatchRepairMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'autoRunPatchRepair',
      message.enabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}

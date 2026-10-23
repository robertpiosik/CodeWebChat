import * as path from 'path'
import * as vscode from 'vscode'

export const get_checkpoint_path = (
  timestamp: number,
  extension_context: vscode.ExtensionContext
): string => {
  const checkpoint_dir_name = `cwc-checkpoint-${timestamp}`
  return path.join(
    extension_context.globalStorageUri.fsPath,
    'checkpoints',
    checkpoint_dir_name
  )
}

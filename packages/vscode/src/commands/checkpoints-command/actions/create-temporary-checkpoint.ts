import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import type { Checkpoint } from '../types'
import { copy_workspace_to_dir } from './copy-workspace-to-dir'
import { get_checkpoint_path } from '../utils'

export const create_temporary_checkpoint = async (
  workspace_provider: WorkspaceProvider
): Promise<Checkpoint> => {
  await vscode.workspace.saveAll()
  const timestamp = Date.now()
  const checkpoint_dir_path = get_checkpoint_path(timestamp)
  const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
  await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

  await copy_workspace_to_dir(checkpoint_dir_uri, workspace_provider)

  const new_checkpoint: Checkpoint = {
    timestamp,
    title: '',
    is_temporary: true
  }
  return new_checkpoint
}

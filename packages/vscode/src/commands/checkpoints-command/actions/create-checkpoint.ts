import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import type { Checkpoint } from '../types'
import { copy_workspace_to_dir } from './copy-workspace-to-dir'
import { get_checkpoints } from './get-checkpoints'
import { get_checkpoint_path } from '../utils'

export const create_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext,
  title: string = 'Created by user',
  description?: string
): Promise<boolean> => {
  try {
    const timestamp = Date.now()
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Creating checkpoint...',
        cancellable: false
      },
      async () => {
        await vscode.workspace.saveAll()
        const checkpoint_dir_path = get_checkpoint_path(timestamp)
        const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
        await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

        await copy_workspace_to_dir(checkpoint_dir_uri, workspace_provider)

        const checkpoints = await get_checkpoints(context)
        let final_description = description
        if (title == 'Created by user' && description === undefined) {
          const user_checkpoints = checkpoints.filter(
            (c) => c.title == 'Created by user'
          )
          const first_custom_index = user_checkpoints.findIndex(
            (c) => !c.description?.match(/^\(\d+\)$/)
          )

          const relevant_checkpoints =
            first_custom_index === -1
              ? user_checkpoints
              : user_checkpoints.slice(0, first_custom_index)

          const user_checkpoint_numbers = relevant_checkpoints.map((c) =>
            parseInt(c.description!.match(/^\((\d+)\)$/)![1], 10)
          )

          const max_num =
            user_checkpoint_numbers.length > 0
              ? Math.max(...user_checkpoint_numbers)
              : 0
          final_description = `(${max_num + 1})`
        }
        const new_checkpoint: Checkpoint = {
          title,
          timestamp,
          description: final_description
        }

        checkpoints.push(new_checkpoint)
        await context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
      }
    )
    return true
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to create checkpoint: ${err.message}`
    )
    return false
  }
}

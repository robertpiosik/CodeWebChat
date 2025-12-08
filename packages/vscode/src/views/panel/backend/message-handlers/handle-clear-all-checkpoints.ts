import * as vscode from 'vscode'
import { PanelProvider } from '../panel-provider'
import {
  clear_all_checkpoints,
  get_checkpoints
} from '@/commands/checkpoints-command/actions'
import { dictionary } from '@shared/constants/dictionary'
import { TEMPORARY_CHECKPOINT_STATE_KEY } from '@/constants/state-keys'
import type { Checkpoint } from '@/commands/checkpoints-command/types'

export const handle_clear_all_checkpoints = async (
  panel_provider: PanelProvider
) => {
  const checkpoints = await get_checkpoints(panel_provider.context)
  const temp_checkpoint = panel_provider.context.workspaceState.get<Checkpoint>(
    TEMPORARY_CHECKPOINT_STATE_KEY
  )

  if (checkpoints.length === 0 && !temp_checkpoint) {
    vscode.window.showInformationMessage(
      dictionary.information_message.NOTHING_TO_DELETE
    )
    return
  }

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.CONFIRM_CLEAR_ALL_CHECKPOINTS,
    { modal: true },
    'Clear All'
  )

  if (confirmation == 'Clear All') {
    panel_provider.active_checkpoint_delete_operation = null
    await clear_all_checkpoints(panel_provider.context, panel_provider)
    vscode.window.showInformationMessage(
      dictionary.information_message.ALL_CHECKPOINTS_CLEARED
    )
  }
}

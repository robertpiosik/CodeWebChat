import * as vscode from 'vscode'
import { QUICK_SAVES_STATE_KEY } from '../../../../constants/state-keys'
import { WorkspaceProvider } from '../../../../context/providers/workspace/workspace-provider'
import { SavedContext } from '@/types/context'
import { dictionary } from '@shared/constants/dictionary'
import { apply_saved_context } from '../applying'
import {
  group_files_by_workspace,
  condense_paths,
  add_workspace_prefix
} from './path-utils'

export const handle_quick_save = async (
  slot: number,
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  on_context_selected: () => void
): Promise<void> => {
  const quick_saves = extension_context.workspaceState.get<
    Record<number, SavedContext>
  >(QUICK_SAVES_STATE_KEY, {})
  const existing = quick_saves[slot]

  if (existing) {
    const primary_workspace_root = workspace_provider.getWorkspaceRoot()!
    await apply_saved_context(
      existing,
      primary_workspace_root,
      workspace_provider,
      extension_context
    )
    on_context_selected()
    return
  }

  // Save current context to slot
  const checked_files = workspace_provider.get_checked_files()
  if (checked_files.length == 0) {
    vscode.window.showWarningMessage(
      `Quick Save Slot ${slot} is empty. Select some files first to save them here.`
    )
    return
  }

  const files_by_workspace = group_files_by_workspace(checked_files)
  let all_prefixed_paths: string[] = []

  for (const [root, files] of files_by_workspace.entries()) {
    if (files.length === 0) continue
    const condensed_paths = condense_paths(files, root, workspace_provider)
    const relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))
    const prefixed_paths = add_workspace_prefix(relative_paths, root)
    all_prefixed_paths = [...all_prefixed_paths, ...prefixed_paths]
  }

  const new_context: SavedContext = {
    name: `Quick Save Slot ${slot}`,
    paths: all_prefixed_paths
  }

  quick_saves[slot] = new_context
  await extension_context.workspaceState.update(
    QUICK_SAVES_STATE_KEY,
    quick_saves
  )
  vscode.window.showInformationMessage(
    dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
  )
}

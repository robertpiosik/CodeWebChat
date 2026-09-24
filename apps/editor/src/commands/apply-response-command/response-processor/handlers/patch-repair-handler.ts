import * as vscode from 'vscode'
import { t } from '@/i18n'
import { create_safe_path } from '@/utils/path-sanitizer'
import { PatchRepairItem } from '../../utils/response-parser'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { set_file_applied_with_patch_repair } from '../../utils/preview/workspace-listener'
import {
  get_workspace_map_and_default,
  resolve_workspace_root
} from '../../utils/workspace'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '@/constants/state-keys'
import { OriginalFileState } from '../../types/original-file-state'

export const handle_patch_repair = async (params: {
  patch_items: PatchRepairItem[]
  prompt_view_provider: PromptViewProvider
  workspace_provider: WorkspaceProvider
}): Promise<void> => {
  const { workspace_map, default_workspace } = get_workspace_map_and_default()

  const original_states = params.prompt_view_provider.extension_context.workspaceState.get<OriginalFileState[]>(LAST_APPLIED_CHANGES_STATE_KEY)

  params.workspace_provider.pause_file_watcher()
  try {
    for (const patch_item of params.patch_items) {
      const workspace_root = resolve_workspace_root({
        workspace_name: patch_item.workspace_name,
        workspace_map,
        default_workspace
      })
      const safe_path = create_safe_path(workspace_root, patch_item.file_path)
      if (safe_path) {
        if (original_states) {
          const state = original_states.find(
            (s) =>
              s.file_path == patch_item.file_path &&
              s.workspace_name == patch_item.workspace_name
          )
          if (state?.file_path_to_restore) {
            const old_workspace_root = resolve_workspace_root({
              workspace_name:
                state.restore_workspace_name ?? patch_item.workspace_name,
              workspace_map,
              default_workspace
            })
            const old_safe_path = create_safe_path(
              old_workspace_root,
              state.file_path_to_restore
            )
            if (old_safe_path) {
              try {
                await vscode.workspace.fs.delete(vscode.Uri.file(old_safe_path))
              } catch (e) {}
            }
          }
        }

        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(safe_path),
          Buffer.from(patch_item.content, 'utf8')
        )
        if (set_file_applied_with_patch_repair) {
          set_file_applied_with_patch_repair({
            file_path: patch_item.file_path,
            workspace_name: patch_item.workspace_name,
            new_content: patch_item.content
          })
        }
      }
    }

    params.prompt_view_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: t('command.apply-response-command.success.patched-successfully')
    })
  } finally {
    params.workspace_provider.resume_file_watcher()
  }
}
import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'

export const handle_parent_folder_result = (params: {
  result:
    | 'added'
    | 'back'
    | 'no_folders'
    | 'no_workspace_root'
    | 'cancel'
    | undefined
  quick_pick: vscode.QuickPick<vscode.QuickPickItem & { file_path?: string }>
  workspace_provider: WorkspaceProvider
  item: vscode.QuickPickItem & { file_path?: string }
  on_cancel: () => void
}) => {
  if (
    params.result === 'added' ||
    params.result === 'back' ||
    params.result === 'no_folders' ||
    params.result === 'no_workspace_root'
  ) {
    const current_items = params.quick_pick.items
    let current_selected = params.quick_pick.selectedItems

    if (params.result === 'added') {
      const currently_checked = params.workspace_provider.get_checked_files()
      current_selected = current_items.filter(
        (i) =>
          (i.file_path && currently_checked.includes(i.file_path)) ||
          current_selected.includes(i)
      )
    }

    params.quick_pick.items = [...current_items]
    params.quick_pick.selectedItems = current_selected
    params.quick_pick.show()

    setTimeout(() => {
      params.quick_pick.activeItems = [params.item]
    }, 0)
  } else {
    params.on_cancel()
    params.quick_pick.dispose()
  }
}

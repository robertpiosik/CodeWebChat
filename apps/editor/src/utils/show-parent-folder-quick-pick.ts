import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'

export const show_parent_folder_quick_pick = async (params: {
  file_path: string
  workspace_provider: WorkspaceProvider
}): Promise<
  'added' | 'back' | 'cancel' | 'no_folders' | 'no_workspace_root'
> => {
  const workspace_root = params.workspace_provider.get_workspace_root_for_file(
    params.file_path
  )

  if (!workspace_root) return 'no_workspace_root'

  const folders: { label: string; full_path: string }[] = []
  let current_dir = path.dirname(params.file_path)

  while (
    current_dir.startsWith(workspace_root) &&
    current_dir != workspace_root
  ) {
    const relative = path.relative(workspace_root, current_dir)
    folders.push({
      label: relative.replace(/\\/g, '/'),
      full_path: current_dir
    })
    current_dir = path.dirname(current_dir)
  }

  if (folders.length == 0) {
    vscode.window.showInformationMessage(
      t('utils.show-parent-folder-quick-pick.no-parent-folders')
    )
    return 'no_folders'
  }

  const folder_quick_pick = vscode.window.createQuickPick<{
    label: string
    full_path: string
  }>()
  folder_quick_pick.title = t(
    'utils.show-parent-folder-quick-pick.parent-folders'
  )
  folder_quick_pick.placeholder = t(
    'utils.show-parent-folder-quick-pick.select-folder'
  )
  folder_quick_pick.items = folders.map((f) => ({
    label: f.label,
    full_path: f.full_path
  }))
  folder_quick_pick.ignoreFocusOut = false
  folder_quick_pick.buttons = [vscode.QuickInputButtons.Back]

  return new Promise((resolve) => {
    let folder_accepted = false
    let go_back = false

    folder_quick_pick.onDidTriggerButton((button) => {
      if (button === vscode.QuickInputButtons.Back) {
        go_back = true
        folder_quick_pick.hide()
      }
    })

    folder_quick_pick.onDidAccept(async () => {
      const selected = folder_quick_pick.selectedItems[0]
      if (selected) {
        folder_accepted = true
        const file_item = new FileItem(
          path.basename(selected.full_path),
          vscode.Uri.file(selected.full_path),
          vscode.TreeItemCollapsibleState.Collapsed,
          true,
          vscode.TreeItemCheckboxState.Unchecked,
          false,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        )

        await params.workspace_provider.update_check_state(
          file_item,
          vscode.TreeItemCheckboxState.Checked
        )
        folder_quick_pick.hide()
      }
    })

    folder_quick_pick.onDidHide(() => {
      folder_quick_pick.dispose()

      if (folder_accepted) {
        resolve('added')
      } else if (go_back) {
        resolve('back')
      } else {
        resolve('cancel')
      }
    })

    folder_quick_pick.show()
  })
}

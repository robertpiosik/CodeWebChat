import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'

export async function at_sign_quick_pick(params: {
  workspace_provider: WorkspaceProvider
}): Promise<string | undefined> {
  const checked_paths = params.workspace_provider.get_all_checked_paths()
  if (checked_paths.length == 0) {
    vscode.window.showWarningMessage('Nothing is selected in context.')
    return
  }

  const workspace_roots = params.workspace_provider.getWorkspaceRoots()

  const quick_pick_items = checked_paths.map((p) => {
    let relative_path = p
    const root = params.workspace_provider.get_workspace_root_for_file(p)
    if (root) {
      if (workspace_roots.length > 1) {
        const ws_name = params.workspace_provider.get_workspace_name(root)
        relative_path = path.join(ws_name, path.relative(root, p))
      } else {
        relative_path = path.relative(root, p)
      }
    }
    return { label: relative_path.replace(/\\/g, '/') }
  })

  quick_pick_items.sort((a, b) => natural_sort(a.label, b.label))

  const selected_path_item = await vscode.window.showQuickPick(
    quick_pick_items,
    {
      placeHolder: 'Select a path to place in the input field'
    }
  )

  if (selected_path_item) {
    return `\`${selected_path_item.label}\` `
  }
  return
}

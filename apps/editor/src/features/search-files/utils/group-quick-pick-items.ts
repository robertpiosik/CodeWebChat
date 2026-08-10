import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'

export const group_quick_pick_items = <
  T extends vscode.QuickPickItem & { workspace_name?: string }
>(params: {
  mapped_items: T[]
  is_multi_root: boolean
  workspace_provider: WorkspaceProvider
}): T[] => {
  const quick_pick_items: T[] = []

  if (params.is_multi_root) {
    const grouped = new Map<string, T[]>()
    for (const item of params.mapped_items) {
      const ws = item.workspace_name
      if (!ws) continue
      if (!grouped.has(ws)) grouped.set(ws, [])
      grouped.get(ws)!.push(item)
    }

    const ordered_workspaces = params.workspace_provider
      .get_workspace_roots()
      .map((root) => params.workspace_provider.get_workspace_name(root))

    const unique_ordered_workspaces = Array.from(new Set(ordered_workspaces))

    for (const ws of unique_ordered_workspaces) {
      if (grouped.has(ws)) {
        quick_pick_items.push({
          label: ws,
          kind: vscode.QuickPickItemKind.Separator
        } as T)
        quick_pick_items.push(...grouped.get(ws)!)
      }
    }
  } else {
    quick_pick_items.push(...params.mapped_items)
  }

  return quick_pick_items
}

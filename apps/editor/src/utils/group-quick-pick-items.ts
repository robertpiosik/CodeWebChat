import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'

export const group_quick_pick_items = <
  T extends vscode.QuickPickItem & { workspace_name?: string }
>(params: {
  mapped_items: T[]
  is_multi_root: boolean
  workspace_provider: WorkspaceProvider
  label_prefix?: string
}): T[] => {
  const quick_pick_items: T[] = []

  if (params.mapped_items.length > 0 && params.label_prefix) {
    quick_pick_items.push({
      label: params.label_prefix,
      kind: vscode.QuickPickItemKind.Separator
    } as T)
  }

  quick_pick_items.push(...params.mapped_items)

  return quick_pick_items
}

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '../../../utils/path-sanitizer'

export type ReviewDecision =
  | 'Yes'
  | 'No'
  | 'Yes to All'
  | 'Cancel'
  | 'Previous'
  | 'Next'
export let review_promise_resolve:
  | ((decision: ReviewDecision) => void)
  | undefined

async function showDiffWithActions(
  left_uri: vscode.Uri,
  right_content: string,
  title: string
): Promise<ReviewDecision> {
  const right_doc = await vscode.workspace.openTextDocument({
    content: right_content
  })

  await vscode.commands.executeCommand(
    'setContext',
    'codeWebChat.diff.isVisible',
    true
  )
  await vscode.commands.executeCommand(
    'vscode.diff',
    left_uri,
    right_doc.uri,
    title,
    {
      preview: false
    }
  )

  return new Promise<ReviewDecision>((resolve) => {
    review_promise_resolve = resolve
  }).finally(() => {
    review_promise_resolve = undefined // Clean up resolver
    vscode.commands.executeCommand(
      'setContext',
      'codeWebChat.diff.isVisible',
      false
    )
  })
}

export type ChangeItem = {
  file_path: string
  content: string
  workspace_name?: string
  is_new?: boolean
}

export async function review_changes_in_diff_view<T extends ChangeItem>(
  changes: T[]
): Promise<T[] | null> {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    vscode.window.showErrorMessage('No workspace folder open.')
    return null
  }
  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  const review_items = changes.map((change) => ({
    change,
    status: 'pending' as 'pending' | 'accepted' | 'rejected'
  }))

  let yes_to_all = false
  let current_index = 0

  while (current_index >= 0 && current_index < review_items.length) {
    if (yes_to_all) {
      review_items.forEach((item) => {
        if (item.status == 'pending') item.status = 'accepted'
      })
      break
    }

    const review_item = review_items[current_index]
    if (review_item.status != 'pending') {
      current_index++
      continue
    }
    const { change } = review_item

    let workspace_root = default_workspace
    if (change.workspace_name && workspace_map.has(change.workspace_name)) {
      workspace_root = workspace_map.get(change.workspace_name)!
    }
    const safe_path = create_safe_path(workspace_root, change.file_path)
    if (!safe_path) {
      review_item.status = 'rejected'
      current_index++
      continue
    }

    const file_exists = fs.existsSync(safe_path)

    const left_uri = file_exists
      ? vscode.Uri.file(safe_path)
      : vscode.Uri.from({ scheme: 'untitled', path: safe_path })

    const pending_files = review_items.filter((f) => f.status === 'pending')
    const pending_index = pending_files.findIndex(
      (f) => f.change.file_path == change.file_path
    )
    const title = `${path.basename(change.file_path)} (Reviewing ${
      pending_index + 1
    } of ${pending_files.length})`

    const choice = await showDiffWithActions(left_uri, change.content, title)
    await vscode.commands.executeCommand(
      'workbench.action.revertAndCloseActiveEditor'
    )

    switch (choice) {
      case 'Yes':
        review_item.status = 'accepted'
        current_index++
        break
      case 'No':
        review_item.status = 'rejected'
        current_index++
        break
      case 'Yes to All':
        yes_to_all = true
        break
      case 'Next':
        {
          const next_pending_index = review_items.findIndex(
            (item, index) => index > current_index && item.status == 'pending'
          )
          if (next_pending_index != -1) {
            current_index = next_pending_index
          } else {
            const first_pending_index = review_items.findIndex(
              (item) => item.status == 'pending'
            )
            if (first_pending_index != -1) {
              current_index = first_pending_index
            } else {
              current_index = review_items.length
            }
          }
        }
        break
      case 'Previous':
        {
          let prev_pending_index = -1
          for (let i = current_index - 1; i >= 0; i--) {
            if (review_items[i].status == 'pending') {
              prev_pending_index = i
              break
            }
          }
          if (prev_pending_index != -1) {
            current_index = prev_pending_index
          } else {
            let last_pending_index = -1
            for (let i = review_items.length - 1; i >= 0; i--) {
              if (review_items[i].status == 'pending') {
                last_pending_index = i
                break
              }
            }
            if (last_pending_index != -1) {
              current_index = last_pending_index
            }
          }
        }
        break
      default: // Cancel or dismissed
        return null
    }
  }

  const accepted_changes = review_items
    .filter((item) => item.status == 'accepted')
    .map((item) => item.change)

  return accepted_changes
}

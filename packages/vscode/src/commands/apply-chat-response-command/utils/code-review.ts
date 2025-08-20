import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '@/utils/path-sanitizer'
import { ViewProvider } from '@/view/backend/view-provider'

export type CodeReviewDecision =
  | { jump_to: { file_path: string; workspace_name?: string } }
  | { accepted_files: Omit<ChangeItem, 'content'>[] }

export type CodeReviewResult = {
  decision: CodeReviewDecision
  new_content: string
  temp_file_path: string
}

export let code_review_promise_resolve:
  | ((decision: CodeReviewDecision) => void)
  | undefined

const show_diff_with_actions = async (params: {
  left_uri: vscode.Uri
  right_content: string
  title: string
  original_file_path: string
}): Promise<CodeReviewResult> => {
  const dir = path.dirname(params.original_file_path)
  fs.mkdirSync(dir, { recursive: true })
  const ext = path.extname(params.original_file_path)
  const base = path.basename(params.original_file_path, ext)
  const temp_filename = `${base}.${Date.now()}.tmp${ext}`
  const temp_file_path = path.join(dir, temp_filename)

  fs.writeFileSync(temp_file_path, params.right_content)
  const right_doc_uri = vscode.Uri.file(temp_file_path)
  const right_doc = await vscode.workspace.openTextDocument(right_doc_uri)

  await vscode.commands.executeCommand(
    'vscode.diff',
    params.left_uri,
    right_doc.uri,
    params.title,
    {
      preview: false
    }
  )

  return new Promise<CodeReviewResult>((resolve) => {
    code_review_promise_resolve = async (decision) => {
      if ('accepted_files' in decision) {
        if (right_doc.isDirty) {
          await right_doc.save()
        }
        resolve({
          decision,
          new_content: fs.readFileSync(temp_file_path, 'utf-8'),
          temp_file_path
        })
      } else {
        resolve({ decision, new_content: right_doc.getText(), temp_file_path })
      }
    }
  }).finally(() => {
    code_review_promise_resolve = undefined
  })
}

export type ChangeItem = {
  file_path: string
  content: string
  workspace_name?: string
  is_new?: boolean
}

type ProcessedChangeResult =
  | {
      decision: CodeReviewDecision
      updated_content: string
    }
  | {
      error: 'invalid_path'
    }

async function process_single_change(
  change: ChangeItem,
  default_workspace: string,
  workspace_map: Map<string, string>
): Promise<ProcessedChangeResult> {
  let workspace_root = default_workspace
  if (change.workspace_name && workspace_map.has(change.workspace_name)) {
    workspace_root = workspace_map.get(change.workspace_name)!
  }
  const sanitized_file_path = create_safe_path(workspace_root, change.file_path)
  if (!sanitized_file_path) {
    return { error: 'invalid_path' }
  }

  const file_exists = fs.existsSync(sanitized_file_path)
  const left_uri = file_exists
    ? vscode.Uri.file(sanitized_file_path)
    : vscode.Uri.from({ scheme: 'untitled', path: sanitized_file_path })

  let right_content = change.content
  if (file_exists) {
    const left_doc = await vscode.workspace.openTextDocument(left_uri)
    const left_content = left_doc.getText()
    if (left_content.endsWith('\n')) {
      if (!right_content.endsWith('\n')) {
        right_content += '\n'
      } else if (right_content.endsWith('\n\n')) {
        right_content = right_content.slice(0, -1)
      }
    }
  }

  const title = `${path.basename(change.file_path)}`

  const result = await show_diff_with_actions({
    left_uri,
    right_content,
    title,
    original_file_path: sanitized_file_path
  })

  await vscode.commands.executeCommand(
    'workbench.action.revertAndCloseActiveEditor'
  )
  try {
    fs.unlinkSync(result.temp_file_path)
  } catch (e) {
    // Suppress error, as it's just a temp file.
  }

  return {
    decision: result.decision,
    updated_content: result.new_content
  }
}

export const code_review_in_diff_view = async <T extends ChangeItem>(
  changes: T[],
  view_provider?: ViewProvider
): Promise<T[] | null> => {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showErrorMessage('No workspace folder open.')
    return null
  }
  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  if (view_provider) {
    view_provider.send_message({
      command: 'CODE_REVIEW_STARTED',
      files: changes.map((change) => ({
        file_path: change.file_path,
        workspace_name: change.workspace_name,
        is_new: change.is_new
      }))
    })
  }

  try {
    const review_items = changes.map((change) => ({
      change,
      status: 'pending' as 'pending' | 'accepted' | 'rejected'
    }))

    let current_index = 0
    while (current_index >= 0 && current_index < review_items.length) {
      const review_item = review_items[current_index]

      if (review_item.status !== 'pending') {
        current_index++
        continue
      }

      const result = await process_single_change(
        review_item.change,
        default_workspace,
        workspace_map
      )

      if ('error' in result) {
        review_item.status = 'rejected'
        current_index++
        continue
      }

      review_item.change.content = result.updated_content
      const { decision } = result

      if ('accepted_files' in decision) {
        const accepted_files_info = decision.accepted_files
        const accepted_file_identifiers = new Set(
          accepted_files_info.map(
            (file) => `${file.workspace_name || ''}:${file.file_path}`
          )
        )

        review_items.forEach((item) => {
          const file_identifier = `${item.change.workspace_name || ''}:${
            item.change.file_path
          }`
          item.status = accepted_file_identifiers.has(file_identifier)
            ? 'accepted'
            : 'rejected'
        })
        break
      }

      if ('jump_to' in decision) {
        const jump_target = decision.jump_to
        const new_index = review_items.findIndex(
          (item) =>
            item.change.file_path === jump_target.file_path &&
            item.change.workspace_name === jump_target.workspace_name
        )

        if (new_index !== -1) {
          // Ensure the target is reviewable again if it was already processed.
          if (review_items[new_index].status !== 'pending') {
            review_items[new_index].status = 'pending'
          }
          current_index = new_index
        } else {
          current_index++
        }
        continue
      }

      // If the decision is not one of the handled cases, terminate the review.
      // This can happen if the user closes the diff view without making a choice.
      return null
    }

    return review_items
      .filter((item) => item.status === 'accepted')
      .map((item) => item.change)
  } finally {
    if (view_provider) {
      view_provider.send_message({ command: 'CODE_REVIEW_FINISHED' })
    }
  }
}

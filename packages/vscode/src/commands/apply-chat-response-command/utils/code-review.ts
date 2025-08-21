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

type PreparedFile = {
  change: ChangeItem
  sanitized_path: string
  original_content: string
  temp_file_path: string
  file_exists: boolean
}

const prepare_all_files = async (
  changes: ChangeItem[],
  default_workspace: string,
  workspace_map: Map<string, string>
): Promise<PreparedFile[]> => {
  const prepared_files: PreparedFile[] = []

  for (const change of changes) {
    let workspace_root = default_workspace
    if (change.workspace_name && workspace_map.has(change.workspace_name)) {
      workspace_root = workspace_map.get(change.workspace_name)!
    }

    const sanitized_file_path = create_safe_path(
      workspace_root,
      change.file_path
    )
    if (!sanitized_file_path) {
      // Skip invalid paths
      continue
    }

    const file_exists = fs.existsSync(sanitized_file_path)
    let original_content = ''

    if (file_exists) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(sanitized_file_path)
      )
      original_content = doc.getText()
    }

    const dir = path.dirname(sanitized_file_path)
    fs.mkdirSync(dir, { recursive: true })
    const ext = path.extname(sanitized_file_path)
    const base = path.basename(sanitized_file_path, ext)
    const temp_filename = `${base}.${Date.now()}.tmp${ext}`
    const temp_file_path = path.join(dir, temp_filename)

    prepared_files.push({
      change,
      sanitized_path: sanitized_file_path,
      original_content,
      temp_file_path,
      file_exists
    })
  }

  return prepared_files
}

const create_all_temp_files = (prepared_files: PreparedFile[]): void => {
  prepared_files.forEach((file) => {
    fs.writeFileSync(file.temp_file_path, file.original_content)
  })
}

const modify_all_originals = (prepared_files: PreparedFile[]): void => {
  prepared_files.forEach((file) => {
    let right_content = file.change.content

    // Handle newline consistency
    if (file.file_exists) {
      if (file.original_content.endsWith('\n')) {
        if (!right_content.endsWith('\n')) {
          right_content += '\n'
        } else if (right_content.endsWith('\n\n')) {
          right_content = right_content.slice(0, -1)
        }
      }
    }

    fs.writeFileSync(file.sanitized_path, right_content)
  })
}

const restore_all_originals = async (
  prepared_files: PreparedFile[]
): Promise<void> => {
  prepared_files.forEach((file) => {
    if (file.file_exists) {
      fs.writeFileSync(file.sanitized_path, file.original_content)
    } else {
      try {
        fs.unlinkSync(file.sanitized_path)
      } catch (e) {
        /* ignore */
      }
    }
  })
  // Wait for filesystem operations to finish
  await new Promise((res) => setTimeout(res, 500))
}

const cleanup_all_temp_files = (prepared_files: PreparedFile[]): void => {
  prepared_files.forEach((file) => {
    try {
      fs.unlinkSync(file.temp_file_path)
    } catch (e) {
      // Suppress error, as it's just a temp file
    }
  })
}

const show_diff_with_actions = async (
  prepared_file: PreparedFile
): Promise<CodeReviewResult> => {
  const left_doc_uri = vscode.Uri.file(prepared_file.temp_file_path)
  const right_doc_uri = vscode.Uri.file(prepared_file.sanitized_path)
  const right_doc = await vscode.workspace.openTextDocument(right_doc_uri)

  const title = `${path.basename(prepared_file.change.file_path)}`

  await vscode.commands.executeCommand(
    'vscode.diff',
    left_doc_uri, // Original content (read-only from temp file)
    right_doc.uri, // Proposed content (editable in actual file)
    title,
    {
      preview: false
    }
  )

  return new Promise<CodeReviewResult>((resolve) => {
    code_review_promise_resolve = async (decision) => {
      let final_content = right_doc.getText()
      if (right_doc.isDirty) {
        await right_doc.save()
        final_content = fs.readFileSync(prepared_file.sanitized_path, 'utf-8')
      }

      if ('accepted_files' in decision) {
        resolve({
          decision,
          new_content: final_content,
          temp_file_path: prepared_file.temp_file_path
        })
      } else {
        resolve({
          decision,
          new_content: final_content,
          temp_file_path: prepared_file.temp_file_path
        })
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

  let prepared_files: PreparedFile[] = []

  try {
    prepared_files = await prepare_all_files(
      changes,
      default_workspace,
      workspace_map
    )

    create_all_temp_files(prepared_files)
    modify_all_originals(prepared_files)

    const review_items = prepared_files.map((file) => ({
      file,
      status: 'pending' as 'pending' | 'accepted' | 'rejected'
    }))

    let current_index = 0
    while (current_index >= 0 && current_index < review_items.length) {
      const review_item = review_items[current_index]

      if (review_item.status !== 'pending') {
        current_index++
        continue
      }

      const result = await show_diff_with_actions(review_item.file)

      // Update content after diff review
      review_item.file.change.content = result.new_content
      const { decision } = result

      if ('accepted_files' in decision) {
        const accepted_files_info = decision.accepted_files
        const accepted_file_identifiers = new Set(
          accepted_files_info.map(
            (file) => `${file.workspace_name || ''}:${file.file_path}`
          )
        )

        review_items.forEach((item) => {
          const file_identifier = `${item.file.change.workspace_name || ''}:${
            item.file.change.file_path
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
            item.file.change.file_path === jump_target.file_path &&
            item.file.change.workspace_name === jump_target.workspace_name
        )

        if (new_index !== -1) {
          // Ensure the target is reviewable again if it was already processed.
          if (review_items[new_index].status != 'pending') {
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
      // Close the current diff editor before returning null.
      await vscode.commands.executeCommand(
        'workbench.action.revertAndCloseActiveEditor'
      )
      return null
    }

    // Close any remaining diff editor after the loop finishes
    await vscode.commands.executeCommand(
      'workbench.action.revertAndCloseActiveEditor'
    )

    return review_items
      .filter((item) => item.status == 'accepted')
      .map((item) => item.file.change as T)
  } finally {
    await restore_all_originals(prepared_files)

    cleanup_all_temp_files(prepared_files)

    if (view_provider) {
      view_provider.send_message({ command: 'CODE_REVIEW_FINISHED' })
    }
  }
}

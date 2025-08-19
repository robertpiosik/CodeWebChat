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
  file_path_for_right_doc: string
}): Promise<CodeReviewResult> => {
  const dir = path.dirname(params.file_path_for_right_doc)
  fs.mkdirSync(dir, { recursive: true })
  const ext = path.extname(params.file_path_for_right_doc)
  const base = path.basename(params.file_path_for_right_doc, ext)
  const temp_filename = `${base}.tmp-${Date.now()}${ext}`
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

export const code_review_in_diff_view = async <T extends ChangeItem>(
  changes: T[],
  view_provider?: ViewProvider
): Promise<T[] | null> => {
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

  if (view_provider) {
    view_provider.send_message({
      command: 'CODE_REVIEW_STARTED',
      files: changes.map((c) => ({
        file_path: c.file_path,
        workspace_name: c.workspace_name,
        is_new: c.is_new
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

      const left_doc = await vscode.workspace.openTextDocument(left_uri)
      const left_content = left_doc.getText()

      if (file_exists) {
        if (left_content.endsWith('\n')) {
          if (!change.content.endsWith('\n')) {
            change.content += '\n'
          } else if (change.content.endsWith('\n\n')) {
            change.content = change.content.slice(0, -1)
          }
        }
      }

      const title = `${path.basename(change.file_path)}`

      const result = await show_diff_with_actions({
        left_uri: left_doc.uri,
        right_content: change.content,
        title,
        file_path_for_right_doc: safe_path
      })
      const choice = result.decision
      const new_content = result.new_content
      const temp_file_path = result.temp_file_path

      change.content = new_content
      await vscode.commands.executeCommand(
        'workbench.action.revertAndCloseActiveEditor'
      )
      try {
        fs.unlinkSync(temp_file_path)
      } catch (e) {
        // ignore, it's a temp file
      }
      if ('accepted_files' in choice) {
        const accepted_files_info = choice.accepted_files
        const accepted_keys = new Set(
          accepted_files_info.map(
            (f) => `${f.workspace_name || ''}:${f.file_path}`
          )
        )

        review_items.forEach((item) => {
          const key = `${item.change.workspace_name || ''}:${
            item.change.file_path
          }`
          if (accepted_keys.has(key)) {
            item.status = 'accepted'
          } else {
            item.status = 'rejected'
          }
        })
        break
      }

      if ('jump_to' in choice) {
        const jump_target = choice.jump_to
        const new_index = review_items.findIndex(
          (item) =>
            item.change.file_path == jump_target.file_path &&
            item.change.workspace_name == jump_target.workspace_name
        )

        if (new_index != -1) {
          if (review_items[new_index].status != 'pending') {
            review_items[new_index].status = 'pending'
          }
          current_index = new_index
        }
        continue
      }

      return null
    }

    return review_items
      .filter((item) => item.status == 'accepted')
      .map((item) => item.change)
  } finally {
    if (view_provider) {
      view_provider.send_message({ command: 'CODE_REVIEW_FINISHED' })
    }
  }
}

import * as vscode from 'vscode'
import * as path from 'path'
import { CodeReviewDecision, CodeReviewResult, PreparedFile } from './types'

export let response_preview_promise_resolve:
  | ((decision: CodeReviewDecision) => void)
  | undefined

export const close_review_diff_editors = async (
  prepared_files: PreparedFile[]
): Promise<void> => {
  const temp_file_paths = new Set(prepared_files.map((f) => f.temp_file_path))
  const promises: Thenable<boolean>[] = []

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (
        tab.input instanceof vscode.TabInputTextDiff &&
        temp_file_paths.has(tab.input.original.fsPath)
      ) {
        promises.push(vscode.window.tabGroups.close(tab, true))
      }
    }
  }

  await Promise.all(promises)
}

export const show_diff_with_actions = async (
  prepared_file: PreparedFile
): Promise<CodeReviewResult> => {
  const left_doc_uri = vscode.Uri.file(prepared_file.temp_file_path)
  const right_doc_uri = vscode.Uri.file(prepared_file.sanitized_path)

  const title = path.basename(prepared_file.reviewable_file.file_path)

  if (prepared_file.reviewable_file.file_state !== 'deleted') {
    await vscode.commands.executeCommand(
      'vscode.diff',
      left_doc_uri,
      right_doc_uri,
      title,
      {
        preview: false
      }
    )
  }

  return new Promise<CodeReviewResult>((resolve) => {
    response_preview_promise_resolve = async (decision) => {
      let final_content = ''
      try {
        const right_doc = await vscode.workspace.openTextDocument(right_doc_uri)
        final_content = right_doc.getText()
      } catch (error) {}

      const active_editor = vscode.window.activeTextEditor
      let active_file_path: string | undefined
      let active_position: vscode.Position | undefined

      if (active_editor) {
        active_file_path = active_editor.document.uri.fsPath
        active_position = active_editor.selection.active
      }

      resolve({
        decision,
        new_content: final_content,
        temp_file_path: prepared_file.temp_file_path,
        active_file_path,
        active_position
      })
    }
  }).finally(() => {
    response_preview_promise_resolve = undefined
  })
}

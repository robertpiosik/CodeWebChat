import * as vscode from 'vscode'
import * as path from 'path'
import { CodeReviewDecision, CodeReviewResult, PreparedFile } from './types'

export let code_review_promise_resolve:
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

  await vscode.commands.executeCommand(
    'vscode.diff',
    left_doc_uri,
    right_doc_uri,
    title,
    {
      preview: false
    }
  )

  return new Promise<CodeReviewResult>((resolve) => {
    code_review_promise_resolve = async (decision) => {
      let final_content = ''
      try {
        const right_doc = await vscode.workspace.openTextDocument(right_doc_uri)
        final_content = right_doc.getText()
      } catch (error) {}

      resolve({
        decision,
        new_content: final_content,
        temp_file_path: prepared_file.temp_file_path
      })
    }
  }).finally(() => {
    code_review_promise_resolve = undefined
  })
}

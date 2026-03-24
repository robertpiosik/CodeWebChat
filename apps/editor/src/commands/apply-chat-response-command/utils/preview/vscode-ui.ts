import * as vscode from 'vscode'
import * as path from 'path'
import { PreviewDecision, PreviewResult, PreparedFile } from './types'

export let response_preview_promise_resolve:
  | ((decision: PreviewDecision) => void)
  | undefined

export const get_response_preview_promise_resolve = () =>
  response_preview_promise_resolve

export const set_response_preview_promise_resolve = (
  resolve: ((decision: PreviewDecision) => void) | undefined
) => {
  response_preview_promise_resolve = resolve
}

export const close_preview_diff_editors = async (
  prepared_files: PreparedFile[]
): Promise<void> => {
  const temp_uris = new Set(
    prepared_files.map((f) => vscode.Uri.parse(f.original_uri).toString())
  )
  const promises: Thenable<boolean>[] = []

  for (const tabGroup of vscode.window.tabGroups.all) {
    for (const tab of tabGroup.tabs) {
      if (
        tab.input instanceof vscode.TabInputTextDiff &&
        temp_uris.has(tab.input.original.toString())
      ) {
        promises.push(vscode.window.tabGroups.close(tab, true))
      }
    }
  }

  await Promise.all(promises)
}

export const show_diff_with_actions = async (
  prepared_file: PreparedFile
): Promise<PreviewResult> => {
  const left_doc_uri = vscode.Uri.parse(prepared_file.original_uri)
  const right_doc_uri = vscode.Uri.file(prepared_file.sanitized_path)

  const title = path.basename(prepared_file.previewable_file.file_path)

  if (prepared_file.previewable_file.file_state != 'deleted') {
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

  return new Promise<PreviewResult>((resolve) => {
    response_preview_promise_resolve = async (decision) => {
      let final_content = ''
      try {
        const right_doc = await vscode.workspace.openTextDocument(right_doc_uri)
        final_content = right_doc.getText()
      } catch (error) {}

      const active_editor = vscode.window.activeTextEditor
      let active_file_uri: string | undefined
      let active_position: vscode.Position | undefined

      if (active_editor) {
        active_file_uri = active_editor.document.uri.toString()
        active_position = active_editor.selection.active
      }

      resolve({
        decision,
        new_content: final_content,
        original_uri: prepared_file.original_uri,
        active_file_uri,
        active_position
      })
    }
  }).finally(() => {
    response_preview_promise_resolve = undefined
  })
}

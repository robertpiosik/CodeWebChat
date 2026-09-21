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

const get_first_changed_line = (
  original_content: string,
  new_content: string
): number => {
  const original_lines = original_content.split(/\r?\n/)
  const new_lines = new_content.split(/\r?\n/)
  const max_common_lines = Math.min(original_lines.length, new_lines.length)

  let line = 0
  while (line < max_common_lines && original_lines[line] === new_lines[line]) {
    line++
  }
  return line
}

const scroll_to_first_changed_line = (params: {
  right_doc_uri: vscode.Uri
  original_content: string
  new_content: string
}) => {
  const first_changed_line = get_first_changed_line(
    params.original_content,
    params.new_content
  )

  const active_editor = vscode.window.activeTextEditor
  if (
    active_editor &&
    active_editor.document.uri.toString() == params.right_doc_uri.toString()
  ) {
    const line = Math.min(
      first_changed_line,
      active_editor.document.lineCount - 1
    )
    const position = new vscode.Position(line, 0)
    active_editor.selection = new vscode.Selection(position, position)
    active_editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    )
  }
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

    scroll_to_first_changed_line({
      right_doc_uri,
      original_content: prepared_file.original_content,
      new_content: prepared_file.previewable_file.content
    })
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

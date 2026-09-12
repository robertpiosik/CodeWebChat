import * as vscode from 'vscode'
import { replace_commit_symbol } from '../utils/symbols/git/replace-git-symbols'
import { preview_text_in_temp_file } from '../utils/preview-text-in-temp-file'

export const handle_preview_commit_symbol = async (message: {
  repo_name: string
  commit_hash: string
  commit_message?: string
  type: 'Commit' | 'CommitMessage'
}) => {
  try {
    const message_escaped = message.commit_message
      ? ` "${message.commit_message.replace(/"/g, '\\"')}"`
      : ''
    const instruction = `#${message.type}(${message.repo_name}:${message.commit_hash}${message_escaped})`
    const { commit_definitions } = await replace_commit_symbol({
      instruction
    })

    if (commit_definitions) {
      await preview_text_in_temp_file({
        prefix: 'cwc-commit',
        content: commit_definitions.trim(),
        extension: '.md'
      })
    } else {
      vscode.window.showInformationMessage('Failed to generate commit preview.')
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to preview commit: ${error}`)
  }
}

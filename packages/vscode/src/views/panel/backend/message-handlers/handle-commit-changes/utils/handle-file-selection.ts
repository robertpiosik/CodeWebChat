import * as vscode from 'vscode'
import * as path from 'path'
import { dictionary } from '@shared/constants/dictionary'
import { COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY } from '@/constants/state-keys'
import { display_token_count } from '@/utils/display-token-count'
import { FileData } from './file-utils'

const show_file_selection_dialog = async (params: {
  files_data: FileData[]
  threshold: number
  total_tokens: number
}): Promise<FileData[] | undefined> => {
  const items = params.files_data.map((file) => {
    const formatted_token_count = display_token_count(file.estimated_tokens)
    const relative_path = path.dirname(file.relative_path)

    return {
      label: path.basename(file.relative_path),
      description: `${formatted_token_count} ${
        relative_path != '.' ? relative_path : ''
      }`,
      detail: file.is_large_file ? 'Content omitted (large file)' : '',
      file_data: file,
      picked: true
    }
  })

  const exceeded_by = params.total_tokens - params.threshold
  const formatted_total_tokens = display_token_count(params.total_tokens)
  const formatted_exceeded_by = display_token_count(exceeded_by)
  vscode.window.showInformationMessage(
    `Total tokens in affected files: ${formatted_total_tokens}, exceeds threshold by ${formatted_exceeded_by}.`
  )

  const result = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Review affected files to include'
  })

  if (!result) {
    return undefined
  }

  return result.map((item) => item.file_data)
}

export const handle_file_selection_if_needed = async (params: {
  context: vscode.ExtensionContext
  files_data: FileData[]
}): Promise<FileData[] | null> => {
  const threshold = params.context.globalState.get<number>(
    COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
    20000
  )

  const total_tokens = params.files_data.reduce(
    (sum, file) => sum + file.estimated_tokens,
    0
  )

  if (total_tokens <= threshold) {
    return params.files_data
  }

  const selected_files = await show_file_selection_dialog({
    files_data: params.files_data,
    threshold,
    total_tokens
  })
  if (!selected_files || selected_files.length == 0) {
    vscode.window.showInformationMessage(
      dictionary.information_message
        .NO_FILES_SELECTED_FOR_COMMIT_MESSAGE_GENERATION
    )
    return null
  }

  return selected_files
}

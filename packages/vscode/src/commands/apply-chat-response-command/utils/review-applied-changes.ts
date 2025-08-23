import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { create_safe_path } from '@/utils/path-sanitizer'
import { ViewProvider } from '@/view/backend/view-provider'
import { OriginalFileState } from '@/types/common'

export type CodeReviewDecision =
  | { jump_to: { file_path: string; workspace_name?: string } }
  | { accepted_files: Omit<ReviewableFile, 'content'>[] }

export type CodeReviewResult = {
  decision: CodeReviewDecision
  new_content: string
  temp_file_path: string
}

export let code_review_promise_resolve:
  | ((decision: CodeReviewDecision) => void)
  | undefined

type ReviewableFile = {
  file_path: string
  content: string
  workspace_name?: string
  is_new?: boolean
}

type PreparedFile = {
  reviewable_file: ReviewableFile
  sanitized_path: string
  original_content: string
  temp_file_path: string
  file_exists: boolean
}

const prepare_files_from_original_states = async (
  original_states: OriginalFileState[],
  default_workspace: string,
  workspace_map: Map<string, string>
): Promise<PreparedFile[]> => {
  const prepared_files: PreparedFile[] = []

  for (const state of original_states) {
    let workspace_root = default_workspace
    if (state.workspace_name && workspace_map.has(state.workspace_name)) {
      workspace_root = workspace_map.get(state.workspace_name)!
    }

    const sanitized_file_path = create_safe_path(
      workspace_root,
      state.file_path
    )
    if (!sanitized_file_path) {
      continue
    }

    // Get current content (after apply operation)
    let current_content = ''
    try {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(sanitized_file_path)
      )
      current_content = doc.getText()
    } catch (error) {
      // File might not exist anymore or be inaccessible
      continue
    }

    // Create temp file with original content
    const ext = path.extname(sanitized_file_path)
    const base = path.basename(sanitized_file_path, ext)
    const temp_filename = `${base}.${Date.now()}`
    const temp_file_path = path.join(os.tmpdir(), temp_filename)

    const reviewable_file: ReviewableFile = {
      file_path: state.file_path,
      content: current_content,
      workspace_name: state.workspace_name,
      is_new: state.is_new
    }

    prepared_files.push({
      reviewable_file,
      sanitized_path: sanitized_file_path,
      original_content: state.content,
      temp_file_path,
      file_exists: !state.is_new
    })
  }

  return prepared_files
}

const create_temp_files_with_original_content = (
  prepared_files: PreparedFile[]
): void => {
  prepared_files.forEach((file) => {
    fs.writeFileSync(file.temp_file_path, file.original_content)
  })
}

const cleanup_temp_files = (prepared_files: PreparedFile[]): void => {
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

  const file_status = prepared_file.reviewable_file.is_new
    ? ' (New)'
    : ' (Modified)'
  const title = `${path.basename(
    prepared_file.reviewable_file.file_path
  )}${file_status}`

  await vscode.commands.executeCommand(
    'vscode.diff',
    left_doc_uri, // Original content (read-only from temp file)
    right_doc.uri, // Current content (editable in actual file)
    title,
    {
      preview: false
    }
  )

  return new Promise<CodeReviewResult>((resolve) => {
    code_review_promise_resolve = async (decision) => {
      const final_content = right_doc.getText()

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

export const review_applied_changes = async (
  original_states: OriginalFileState[],
  view_provider?: ViewProvider
): Promise<{
  accepted_files: ReviewableFile[]
  rejected_states: OriginalFileState[]
} | null> => {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showErrorMessage('No workspace folder open.')
    return null
  }

  if (!original_states || original_states.length === 0) {
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
      files: original_states.map((state) => ({
        file_path: state.file_path,
        workspace_name: state.workspace_name,
        is_new: state.is_new
      }))
    })
  }

  let prepared_files: PreparedFile[] = []

  try {
    prepared_files = await prepare_files_from_original_states(
      original_states,
      default_workspace,
      workspace_map
    )

    if (prepared_files.length === 0) {
      return null
    }

    create_temp_files_with_original_content(prepared_files)

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

      review_item.file.reviewable_file.content = result.new_content
      const { decision } = result

      if ('accepted_files' in decision) {
        await vscode.workspace.saveAll()

        const accepted_files_info = decision.accepted_files
        const accepted_file_identifiers = new Set(
          accepted_files_info.map(
            (file) => `${file.workspace_name || ''}:${file.file_path}`
          )
        )

        review_items.forEach((item) => {
          const file_identifier = `${
            item.file.reviewable_file.workspace_name || ''
          }:${item.file.reviewable_file.file_path}`
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
            item.file.reviewable_file.file_path === jump_target.file_path &&
            item.file.reviewable_file.workspace_name ===
              jump_target.workspace_name
        )

        if (new_index !== -1) {
          if (review_items[new_index].status !== 'pending') {
            review_items[new_index].status = 'pending'
          }
          current_index = new_index
        } else {
          current_index++
        }
        continue
      }

      // User closed diff without making a decision
      await vscode.commands.executeCommand(
        'workbench.action.revertAndCloseActiveEditor'
      )
      return null
    }

    // Close any remaining diff editor
    await vscode.commands.executeCommand(
      'workbench.action.revertAndCloseActiveEditor'
    )

    const accepted_files = review_items
      .filter((item) => item.status === 'accepted')
      .map((item) => item.file.reviewable_file)

    // Get rejected states for reverting
    const rejected_items = review_items.filter(
      (item) => item.status === 'rejected'
    )
    const rejected_states = rejected_items
      .map((item) => {
        // Find the corresponding original state
        return original_states.find(
          (state) =>
            state.file_path === item.file.reviewable_file.file_path &&
            state.workspace_name === item.file.reviewable_file.workspace_name
        )
      })
      .filter((state): state is OriginalFileState => state !== undefined)

    return { accepted_files, rejected_states }
  } finally {
    cleanup_temp_files(prepared_files)

    if (view_provider) {
      view_provider.send_message({ command: 'CODE_REVIEW_FINISHED' })
    }
  }
}

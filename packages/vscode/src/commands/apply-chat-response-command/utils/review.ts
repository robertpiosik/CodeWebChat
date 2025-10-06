import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { dictionary } from '@shared/constants/dictionary'
import * as crypto from 'crypto'
import { createTwoFilesPatch } from 'diff'
import { create_safe_path } from '@/utils/path-sanitizer'
import { ViewProvider } from '@/views/panel/backend/view-provider'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { remove_directory_if_empty } from './file-operations'

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

export let toggle_file_review_state:
  | ((file: {
      file_path: string
      workspace_name?: string
      is_checked: boolean
    }) => Promise<void>)
  | undefined

type ReviewableFile = {
  file_path: string
  content: string
  workspace_name?: string
  is_new?: boolean
  is_deleted?: boolean
  lines_added: number
  lines_removed: number
  is_fallback?: boolean
  is_replaced?: boolean
  diff_fallback_method?: 'recount' | 'search_and_replace'
}

type PreparedFile = {
  reviewable_file: ReviewableFile
  sanitized_path: string
  original_content: string
  temp_file_path: string
  file_exists: boolean
  content_to_restore?: string
}

const get_diff_stats = (params: {
  original_content: string
  new_content: string
}): { lines_added: number; lines_removed: number } => {
  if (params.original_content == params.new_content) {
    return { lines_added: 0, lines_removed: 0 }
  }

  const patch = createTwoFilesPatch(
    'original',
    'modified',
    params.original_content,
    params.new_content,
    undefined,
    undefined,
    { context: 0 }
  )

  let lines_added = 0
  let lines_removed = 0

  const lines = patch.split('\n')
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      lines_added++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      lines_removed++
    }
  }

  return { lines_added, lines_removed }
}

const prepare_files_from_original_states = async (params: {
  original_states: OriginalFileState[]
  default_workspace: string
  workspace_map: Map<string, string>
}): Promise<PreparedFile[]> => {
  const prepared_files: PreparedFile[] = []

  for (const state of params.original_states) {
    let workspace_root = params.default_workspace
    if (
      state.workspace_name &&
      params.workspace_map.has(state.workspace_name)
    ) {
      workspace_root = params.workspace_map.get(state.workspace_name)!
    }

    const sanitized_file_path = create_safe_path(
      workspace_root,
      state.file_path
    )
    if (!sanitized_file_path) {
      continue
    }

    let current_content = ''
    try {
      if (fs.existsSync(sanitized_file_path)) {
        current_content = fs.readFileSync(sanitized_file_path, 'utf8')
      }
    } catch (error) {
      continue
    }

    const hash = crypto
      .createHash('md5')
      .update(sanitized_file_path)
      .digest('hex')
    const temp_filename = `cwc-review-${hash}.tmp`
    const temp_file_path = path.join(os.tmpdir(), temp_filename)

    const diff_stats = get_diff_stats({
      original_content: state.content,
      new_content: current_content
    })
    const is_deleted =
      !state.is_new && current_content == '' && state.content != ''

    const reviewable_file: ReviewableFile = {
      file_path: state.file_path,
      content: current_content,
      workspace_name: state.workspace_name,
      is_new: state.is_new || !!state.file_path_to_restore,
      is_deleted,
      lines_added: diff_stats.lines_added,
      lines_removed: diff_stats.lines_removed,
      is_fallback: state.is_fallback,
      is_replaced: state.is_replaced,
      diff_fallback_method: state.diff_fallback_method
    }

    prepared_files.push({
      reviewable_file,
      sanitized_path: sanitized_file_path,
      original_content: state.content,
      temp_file_path,
      file_exists: !state.is_new
    })

    if (state.file_path_to_restore) {
      const restored_sanitized_file_path = create_safe_path(
        workspace_root,
        state.file_path_to_restore
      )
      if (!restored_sanitized_file_path) {
        continue
      }

      const restored_current_content = '' // Deleted

      const restored_hash = crypto
        .createHash('md5')
        .update(restored_sanitized_file_path)
        .digest('hex')
      const restored_temp_filename = `cwc-review-${restored_hash}.tmp`
      const restored_temp_file_path = path.join(
        os.tmpdir(),
        restored_temp_filename
      )

      const restored_diff_stats = get_diff_stats({
        original_content: state.content,
        new_content: restored_current_content
      })

      const restored_reviewable_file: ReviewableFile = {
        file_path: state.file_path_to_restore,
        content: restored_current_content,
        workspace_name: state.workspace_name,
        is_new: false,
        is_deleted: true,
        lines_added: restored_diff_stats.lines_added,
        lines_removed: restored_diff_stats.lines_removed
      }

      prepared_files.push({
        reviewable_file: restored_reviewable_file,
        sanitized_path: restored_sanitized_file_path,
        original_content: state.content,
        temp_file_path: restored_temp_file_path,
        file_exists: false
      })
    }
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
    } catch (e) {}
  })
}

const close_review_diff_editors = async (
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

const show_diff_with_actions = async (
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

export const review = async (params: {
  original_states: OriginalFileState[]
  view_provider?: ViewProvider
}): Promise<{
  accepted_files: ReviewableFile[]
  rejected_states: OriginalFileState[]
} | null> => {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_WORKSPACE_FOLDER_OPEN
    )
    return null
  }

  if (!params.original_states || params.original_states.length == 0) {
    return null
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  let prepared_files: PreparedFile[] = []

  const text_document_change_listener =
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (!params.view_provider) return

      const changed_doc_path = event.document.uri.fsPath
      const changed_file_in_review = prepared_files.find(
        (pf) => pf.sanitized_path === changed_doc_path
      )

      if (changed_file_in_review) {
        const new_content = event.document.getText()
        const original_content = changed_file_in_review.original_content
        const diff_stats = get_diff_stats({
          original_content,
          new_content
        })

        changed_file_in_review.reviewable_file.lines_added =
          diff_stats.lines_added
        changed_file_in_review.reviewable_file.lines_removed =
          diff_stats.lines_removed
        changed_file_in_review.reviewable_file.content = new_content

        params.view_provider.send_message({
          command: 'UPDATE_FILE_IN_REVIEW',
          file: changed_file_in_review.reviewable_file
        })
      }
    })

  try {
    prepared_files = await prepare_files_from_original_states({
      original_states: params.original_states,
      default_workspace,
      workspace_map
    })

    if (params.view_provider) {
      params.view_provider.send_message({
        command: 'CODE_REVIEW_STARTED',
        files: prepared_files.map((p) => p.reviewable_file)
      })
    }

    if (prepared_files.length === 0) {
      return null
    }

    toggle_file_review_state = async ({
      file_path,
      workspace_name,
      is_checked
    }) => {
      const file_to_toggle = prepared_files.find(
        (f) =>
          f.reviewable_file.file_path == file_path &&
          f.reviewable_file.workspace_name == workspace_name
      )

      if (!file_to_toggle) return

      let workspace_root = default_workspace
      if (
        file_to_toggle.reviewable_file.workspace_name &&
        workspace_map.has(file_to_toggle.reviewable_file.workspace_name)
      ) {
        workspace_root = workspace_map.get(
          file_to_toggle.reviewable_file.workspace_name
        )!
      }

      if (!is_checked) {
        // This is the unchecking logic
        // Before reverting, capture current content if file exists
        let current_content = ''
        if (fs.existsSync(file_to_toggle.sanitized_path)) {
          const document = await vscode.workspace.openTextDocument(
            vscode.Uri.file(file_to_toggle.sanitized_path)
          )
          current_content = document.getText()
          // Update the reviewable file content with current edits
          file_to_toggle.reviewable_file.content = current_content
          file_to_toggle.content_to_restore = current_content
        }

        if (file_to_toggle.reviewable_file.is_new) {
          try {
            if (fs.existsSync(file_to_toggle.sanitized_path)) {
              await vscode.workspace.fs.delete(
                vscode.Uri.file(file_to_toggle.sanitized_path)
              )
              await remove_directory_if_empty({
                dir_path: path.dirname(file_to_toggle.sanitized_path),
                workspace_root
              })
            }
          } catch (e) {}
        } else {
          await vscode.workspace.fs.writeFile(
            vscode.Uri.file(file_to_toggle.sanitized_path),
            Buffer.from(file_to_toggle.original_content, 'utf8')
          )
        }
        // This is the checking logic
      } else {
        if (file_to_toggle.reviewable_file.is_deleted) {
          try {
            if (fs.existsSync(file_to_toggle.sanitized_path)) {
              await vscode.workspace.fs.delete(
                vscode.Uri.file(file_to_toggle.sanitized_path)
              )
              await remove_directory_if_empty({
                dir_path: path.dirname(file_to_toggle.sanitized_path),
                workspace_root
              })
            }
          } catch (e) {}
        } else {
          await vscode.workspace.fs.writeFile(
            vscode.Uri.file(file_to_toggle.sanitized_path),
            Buffer.from(
              file_to_toggle.content_to_restore ??
                file_to_toggle.reviewable_file.content,
              'utf8'
            )
          )
        }
      }
    }

    create_temp_files_with_original_content(prepared_files)

    const review_items = prepared_files.map((file) => ({
      file,
      status: 'pending' as 'pending' | 'accepted' | 'rejected'
    }))

    let current_index = 0
    while (current_index >= 0 && current_index < review_items.length) {
      const review_item = review_items[current_index]

      if (review_item.status != 'pending') {
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

        if (new_index != -1) {
          if (review_items[new_index].status != 'pending') {
            review_items[new_index].status = 'pending'
          }
          current_index = new_index
        } else {
          current_index++
        }
        continue
      }
    }

    const accepted_files = review_items
      .filter((item) => item.status == 'accepted')
      .map((item) => item.file.reviewable_file)

    const rejected_items = review_items.filter(
      (item) => item.status == 'rejected'
    )
    const rejected_states = rejected_items
      .map((item) => {
        return params.original_states.find(
          (state) =>
            state.file_path == item.file.reviewable_file.file_path &&
            state.workspace_name == item.file.reviewable_file.workspace_name
        )
      })
      .filter((state): state is OriginalFileState => state !== undefined)

    return { accepted_files, rejected_states }
  } finally {
    text_document_change_listener.dispose()
    await close_review_diff_editors(prepared_files)
    cleanup_temp_files(prepared_files)
    toggle_file_review_state = undefined

    if (params.view_provider) {
      params.view_provider.cancel_all_intelligent_updates()
      params.view_provider.send_message({ command: 'CODE_REVIEW_FINISHED' })
    }
  }
}

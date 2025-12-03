import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as os from 'os'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PreparedFile, ReviewableFile } from './types'
import { get_diff_stats } from './diff-utils'
import { remove_directory_if_empty } from '../file-operations'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { create_temp_files_with_original_content } from './temp-file-manager'

export let toggle_file_review_state:
  | ((file: {
      file_path: string
      workspace_name?: string
      is_checked: boolean
    }) => Promise<void>)
  | undefined

const recalculate_history_item_totals = (item: ResponseHistoryItem) => {
  if (!item.files) {
    item.lines_added = 0
    item.lines_removed = 0
    return
  }
  item.lines_added = item.files
    .filter((f) => f.is_checked)
    .reduce((sum, f) => sum + f.lines_added, 0)
  item.lines_removed = item.files
    .filter((f) => f.is_checked)
    .reduce((sum, f) => sum + f.lines_removed, 0)
}

const update_response_history = (
  panel_provider: PanelProvider,
  created_at: number | undefined,
  updated_file: ReviewableFile
) => {
  if (!created_at) return

  const history = panel_provider.response_history
  const item_to_update = history.find((i) => i.created_at === created_at)
  if (item_to_update) {
    if (!item_to_update.files) {
      item_to_update.files = []
    }
    const file_in_history_index = item_to_update.files.findIndex(
      (f) =>
        f.file_path === updated_file.file_path &&
        f.workspace_name === updated_file.workspace_name
    )

    if (file_in_history_index !== -1) {
      item_to_update.files[file_in_history_index] = updated_file
    } else {
      item_to_update.files.push(updated_file)
    }

    recalculate_history_item_totals(item_to_update)
    panel_provider.send_message({ command: 'RESPONSE_HISTORY', history })
  }
}

export const setup_workspace_listeners = (
  prepared_files: PreparedFile[],
  original_states: OriginalFileState[],
  panel_provider: PanelProvider,
  workspace_map: Map<string, string>,
  default_workspace: string,
  context: vscode.ExtensionContext,
  created_at?: number
) => {
  const deleted_files_content_cache = new Map<string, string>()

  const file_will_delete_listener = vscode.workspace.onWillDeleteFiles(
    (event) => {
      const promise = Promise.all(
        event.files.map(async (uri) => {
          if (uri.scheme !== 'file') return
          try {
            const content = (await vscode.workspace.fs.readFile(uri)).toString()
            deleted_files_content_cache.set(uri.fsPath, content)
          } catch (e) {
            // Ignore, e.g. for directories
          }
        })
      )
      event.waitUntil(promise)
    }
  )

  const text_document_change_listener =
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      const changed_doc_path = event.document.uri.fsPath
      const changed_file_in_review = prepared_files.find(
        (pf) => pf.sanitized_path == changed_doc_path
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
        if (changed_file_in_review.reviewable_file.is_checked) {
          changed_file_in_review.reviewable_file.content = new_content
        }

        update_response_history(
          panel_provider,
          created_at,
          changed_file_in_review.reviewable_file
        )

        panel_provider.send_message({
          command: 'UPDATE_FILE_IN_REVIEW',
          file: changed_file_in_review.reviewable_file
        })
      } else {
        const doc = event.document
        if (doc.uri.scheme != 'file') return
        const workspace_folder = vscode.workspace.getWorkspaceFolder(doc.uri)
        if (!workspace_folder) return

        // Check if it's already added to avoid races
        if (prepared_files.some((pf) => pf.sanitized_path == doc.uri.fsPath)) {
          return
        }

        const new_content = doc.getText()
        const relative_path = vscode.workspace
          .asRelativePath(doc.uri, false)
          .replace(/\\/g, '/')

        let original_content = ''
        let is_new = false
        if (doc.isUntitled) {
          is_new = true
        } else {
          try {
            const contentBytes = await vscode.workspace.fs.readFile(doc.uri)
            original_content = Buffer.from(contentBytes).toString('utf8')
          } catch (e) {
            is_new = true // File on disk does not exist, but buffer does.
          }
        }

        const new_original_state: OriginalFileState = {
          file_path: relative_path,
          content: original_content,
          is_new: is_new,
          workspace_name: workspace_folder.name
        }

        const diff_stats = get_diff_stats({
          original_content: original_content,
          new_content: new_content
        })

        const sanitized_file_path = doc.uri.fsPath
        const hash = crypto
          .createHash('md5')
          .update(sanitized_file_path)
          .digest('hex')
        const temp_filename = `cwc-${hash}.tmp`
        const temp_file_path = path.join(os.tmpdir(), temp_filename)
        const is_deleted =
          !is_new && new_content == '' && original_content != ''

        const reviewable_file: ReviewableFile = {
          type: 'file',
          file_path: relative_path,
          content: new_content,
          workspace_name: workspace_folder.name,
          is_new: is_new,
          is_deleted: is_deleted,
          lines_added: diff_stats.lines_added,
          lines_removed: diff_stats.lines_removed,
          is_checked: true
        }

        const new_prepared_file: PreparedFile = {
          reviewable_file,
          sanitized_path: sanitized_file_path,
          original_content: original_content,
          temp_file_path,
          file_exists: !is_new
        }

        original_states.push(new_original_state)
        prepared_files.push(new_prepared_file)
        create_temp_files_with_original_content([new_prepared_file])
        update_response_history(
          panel_provider,
          created_at,
          new_prepared_file.reviewable_file
        )
        panel_provider.send_message({
          command: 'UPDATE_FILE_IN_REVIEW',
          file: new_prepared_file.reviewable_file
        })
      }
    })

  const file_delete_listener = vscode.workspace.onDidDeleteFiles((event) => {
    for (const uri of event.files) {
      if (uri.scheme != 'file') continue

      const deleted_file_path = uri.fsPath
      const deleted_file_in_review = prepared_files.find(
        (pf) => pf.sanitized_path == deleted_file_path
      )

      if (!deleted_file_in_review) {
        const workspace_folder = vscode.workspace.getWorkspaceFolder(uri)
        if (!workspace_folder) continue

        if (prepared_files.some((pf) => pf.sanitized_path == uri.fsPath)) {
          continue
        }

        const new_content = ''
        const relative_path = vscode.workspace
          .asRelativePath(uri, false)
          .replace(/\\/g, '/')

        const original_content_for_undo =
          deleted_files_content_cache.get(uri.fsPath) ?? ''
        deleted_files_content_cache.delete(uri.fsPath)

        const new_original_state: OriginalFileState = {
          file_path: relative_path,
          content: original_content_for_undo,
          is_new: false,
          workspace_name: workspace_folder.name
        }

        const diff_stats = get_diff_stats({
          original_content: original_content_for_undo,
          new_content: new_content
        })

        const sanitized_file_path = uri.fsPath
        const hash = crypto
          .createHash('md5')
          .update(sanitized_file_path)
          .digest('hex')
        const temp_filename = `cwc-${hash}.tmp`
        const temp_file_path = path.join(os.tmpdir(), temp_filename)

        const reviewable_file: ReviewableFile = {
          type: 'file',
          file_path: relative_path,
          content: new_content,
          workspace_name: workspace_folder.name,
          is_new: false,
          is_deleted: true,
          lines_added: diff_stats.lines_added,
          lines_removed: diff_stats.lines_removed,
          is_checked: true
        }

        const new_prepared_file: PreparedFile = {
          reviewable_file,
          sanitized_path: sanitized_file_path,
          original_content: original_content_for_undo,
          temp_file_path,
          file_exists: false
        }

        original_states.push(new_original_state)
        prepared_files.push(new_prepared_file)
        create_temp_files_with_original_content([new_prepared_file])
        update_response_history(
          panel_provider,
          created_at,
          new_prepared_file.reviewable_file
        )
        panel_provider.send_message({
          command: 'UPDATE_FILE_IN_REVIEW',
          file: new_prepared_file.reviewable_file
        })
      } else {
        deleted_file_in_review.reviewable_file.is_deleted = true
        deleted_file_in_review.reviewable_file.content = ''
        const diff_stats = get_diff_stats({
          original_content: deleted_file_in_review.original_content,
          new_content: ''
        })
        deleted_file_in_review.reviewable_file.lines_added =
          diff_stats.lines_added
        deleted_file_in_review.reviewable_file.lines_removed =
          diff_stats.lines_removed
        update_response_history(
          panel_provider,
          created_at,
          deleted_file_in_review.reviewable_file
        )
        panel_provider.send_message({
          command: 'UPDATE_FILE_IN_REVIEW',
          file: deleted_file_in_review.reviewable_file
        })
      }
    }
  })

  const file_created_listener = vscode.workspace.onDidCreateFiles(
    async (event) => {
      for (const uri of event.files) {
        if (uri.scheme !== 'file') continue

        const workspace_folder = vscode.workspace.getWorkspaceFolder(uri)
        if (!workspace_folder) continue

        // Avoid duplicates if already tracked
        if (prepared_files.some((pf) => pf.sanitized_path === uri.fsPath)) {
          continue
        }

        // Read the content of the newly created file (may be empty)
        let new_content = ''
        try {
          const doc = await vscode.workspace.openTextDocument(uri)
          new_content = doc.getText()
        } catch (e) {
          new_content = ''
        }

        const relative_path = vscode.workspace
          .asRelativePath(uri, false)
          .replace(/\\/g, '/')

        const original_content = ''
        const is_new = true

        const new_original_state: OriginalFileState = {
          file_path: relative_path,
          content: original_content,
          is_new: is_new,
          workspace_name: workspace_folder.name
        }

        const diff_stats = get_diff_stats({
          original_content: original_content,
          new_content: new_content
        })

        const sanitized_file_path = uri.fsPath
        const hash = crypto
          .createHash('md5')
          .update(sanitized_file_path)
          .digest('hex')
        const temp_filename = `cwc-${hash}.tmp`
        const temp_file_path = path.join(os.tmpdir(), temp_filename)

        const reviewable_file: ReviewableFile = {
          type: 'file',
          file_path: relative_path,
          content: new_content,
          workspace_name: workspace_folder.name,
          is_new: true,
          is_deleted: false,
          lines_added: diff_stats.lines_added,
          lines_removed: diff_stats.lines_removed,
          is_checked: true
        }

        const new_prepared_file: PreparedFile = {
          reviewable_file,
          sanitized_path: sanitized_file_path,
          original_content: original_content,
          temp_file_path,
          file_exists: false
        }

        original_states.push(new_original_state)
        prepared_files.push(new_prepared_file)

        // Create temp file with the original (empty) content for diff view
        create_temp_files_with_original_content([new_prepared_file])

        update_response_history(
          panel_provider,
          created_at,
          new_prepared_file.reviewable_file
        )
        // Notify the panel to include this file in the review UI
        panel_provider.send_message({
          command: 'UPDATE_FILE_IN_REVIEW',
          file: new_prepared_file.reviewable_file
        })
      }
    }
  )

  const file_renamed_listener = vscode.workspace.onDidRenameFiles(
    async (event) => {
      for (const { oldUri, newUri } of event.files) {
        if (oldUri.scheme !== 'file' || newUri.scheme !== 'file') continue

        // Skip directories (best effort)
        try {
          const stat = fs.statSync(newUri.fsPath)
          if (stat.isDirectory()) {
            continue
          }
        } catch {
          // If stat fails, proceed as file rename
        }

        const old_workspace_folder = vscode.workspace.getWorkspaceFolder(oldUri)
        const new_workspace_folder = vscode.workspace.getWorkspaceFolder(newUri)
        if (!new_workspace_folder) {
          continue
        }

        const old_relative = vscode.workspace
          .asRelativePath(oldUri, false)
          .replace(/\\/g, '/')
        const new_relative = vscode.workspace
          .asRelativePath(newUri, false)
          .replace(/\\/g, '/')

        // Find existing tracked file by old path
        const existing = prepared_files.find(
          (pf) => pf.sanitized_path == oldUri.fsPath
        )

        // Read new file content (post-rename)
        let new_content = ''
        try {
          const doc = await vscode.workspace.openTextDocument(newUri)
          new_content = doc.getText()
        } catch {
          new_content = ''
        }

        if (existing) {
          // Update existing entry to point to the new path
          existing.sanitized_path = newUri.fsPath
          existing.reviewable_file.file_path = new_relative
          existing.reviewable_file.workspace_name = new_workspace_folder.name
          existing.reviewable_file.is_new = true
          existing.reviewable_file.is_deleted = false
          existing.reviewable_file.content = new_content

          const diff_stats_updated = get_diff_stats({
            original_content: existing.original_content,
            new_content
          })
          existing.reviewable_file.lines_added = diff_stats_updated.lines_added
          existing.reviewable_file.lines_removed =
            diff_stats_updated.lines_removed

          // Also add a synthetic "deleted" entry for the old path so UI shows delete+create
          // Use the original content we already have for accurate stats and restoration
          const oldSanitized = oldUri.fsPath
          const oldHash = crypto
            .createHash('md5')
            .update(oldSanitized)
            .digest('hex')
          const oldTemp = path.join(os.tmpdir(), `cwc-${oldHash}.tmp`)

          const deleted_diff_stats = get_diff_stats({
            original_content: existing.original_content,
            new_content: ''
          })

          const deleted_reviewable: ReviewableFile = {
            type: 'file',
            file_path: old_relative,
            content: '',
            workspace_name:
              old_workspace_folder?.name ??
              existing.reviewable_file.workspace_name,
            is_new: false,
            is_deleted: true,
            lines_added: deleted_diff_stats.lines_added,
            lines_removed: deleted_diff_stats.lines_removed,
            is_checked: true
          }

          const deleted_prepared: PreparedFile = {
            reviewable_file: deleted_reviewable,
            sanitized_path: oldSanitized,
            original_content: existing.original_content,
            temp_file_path: oldTemp,
            file_exists: false
          }

          prepared_files.push(deleted_prepared)
          create_temp_files_with_original_content([deleted_prepared])

          // Track state for downstream consumers (rename grouping)
          original_states.push({
            file_path: new_relative,
            content: existing.original_content,
            is_new: true,
            workspace_name: new_workspace_folder.name,
            file_path_to_restore: old_relative
          })

          // Notify UI
          update_response_history(
            panel_provider,
            created_at,
            existing.reviewable_file
          )
          panel_provider.send_message({
            command: 'UPDATE_FILE_IN_REVIEW',
            file: existing.reviewable_file
          })
          update_response_history(
            panel_provider,
            created_at,
            deleted_prepared.reviewable_file
          )
          panel_provider.send_message({
            command: 'UPDATE_FILE_IN_REVIEW',
            file: deleted_prepared.reviewable_file
          })
        } else {
          // Not previously tracked: treat rename as delete (old) + create (new)
          if (
            prepared_files.some((pf) => pf.sanitized_path === newUri.fsPath)
          ) {
            continue
          }

          // New entry for the new path (as created)
          const newSanitized = newUri.fsPath
          const newHash = crypto
            .createHash('md5')
            .update(newSanitized)
            .digest('hex')
          const newTemp = path.join(os.tmpdir(), `cwc-${newHash}.tmp`)

          const create_diff_stats = get_diff_stats({
            original_content: '',
            new_content
          })

          const created_reviewable: ReviewableFile = {
            type: 'file',
            file_path: new_relative,
            content: new_content,
            workspace_name: new_workspace_folder.name,
            is_new: true,
            is_deleted: false,
            lines_added: create_diff_stats.lines_added,
            lines_removed: create_diff_stats.lines_removed,
            is_checked: true
          }

          const created_prepared: PreparedFile = {
            reviewable_file: created_reviewable,
            sanitized_path: newSanitized,
            original_content: '',
            temp_file_path: newTemp,
            file_exists: false
          }

          const oldSanitized = oldUri.fsPath
          const oldHash = crypto
            .createHash('md5')
            .update(oldSanitized)
            .digest('hex')
          const oldTemp = path.join(os.tmpdir(), `cwc-${oldHash}.tmp`)

          const deleted_diff_stats = get_diff_stats({
            original_content: new_content,
            new_content: ''
          })

          const deleted_reviewable: ReviewableFile = {
            type: 'file',
            file_path: old_relative,
            content: '',
            workspace_name:
              old_workspace_folder?.name ?? new_workspace_folder.name,
            is_new: false,
            is_deleted: true,
            lines_added: deleted_diff_stats.lines_added,
            lines_removed: deleted_diff_stats.lines_removed,
            is_checked: true
          }

          const deleted_prepared: PreparedFile = {
            reviewable_file: deleted_reviewable,
            sanitized_path: oldSanitized,
            original_content: new_content,
            temp_file_path: oldTemp,
            file_exists: false
          }

          original_states.push({
            file_path: new_relative,
            content: new_content,
            is_new: true,
            workspace_name: new_workspace_folder.name,
            file_path_to_restore: old_relative
          })
          prepared_files.push(created_prepared, deleted_prepared)

          create_temp_files_with_original_content([
            created_prepared,
            deleted_prepared
          ])

          // Notify UI
          update_response_history(
            panel_provider,
            created_at,
            created_reviewable
          )
          panel_provider.send_message({
            command: 'UPDATE_FILE_IN_REVIEW',
            file: created_reviewable
          })
          update_response_history(
            panel_provider,
            created_at,
            deleted_reviewable
          )
          panel_provider.send_message({
            command: 'UPDATE_FILE_IN_REVIEW',
            file: deleted_reviewable
          })
        }
      }
    }
  )

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

    file_to_toggle.reviewable_file.is_checked = is_checked

    if (created_at) {
      const history = panel_provider.response_history
      const item_to_update = history.find((i) => i.created_at === created_at)
      if (item_to_update && item_to_update.files) {
        const file_in_history = item_to_update.files.find(
          (f) =>
            f.file_path === file_path && f.workspace_name === workspace_name
        )
        if (file_in_history) {
          file_in_history.is_checked = is_checked
          recalculate_history_item_totals(item_to_update)
          panel_provider.send_message({ command: 'RESPONSE_HISTORY', history })
        }
      }
    }

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
      // Before reverting, capture current content if file exists
      if (fs.existsSync(file_to_toggle.sanitized_path)) {
        const document = await vscode.workspace.openTextDocument(
          vscode.Uri.file(file_to_toggle.sanitized_path)
        )
        const current_content = document.getText()
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

  const dispose = () => {
    file_will_delete_listener.dispose()
    text_document_change_listener.dispose()
    file_delete_listener.dispose()
    file_created_listener.dispose()
    file_renamed_listener.dispose()
    toggle_file_review_state = undefined
  }

  return { dispose }
}

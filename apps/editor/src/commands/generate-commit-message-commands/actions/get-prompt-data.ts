import * as vscode from 'vscode'
import * as path from 'path'
import {
  prepare_staged_changes,
  GitRepository
} from '../../../utils/git-repository-utils'
import { build_commit_message_prompt } from '../utils/build-commit-message-prompt'
import { CommitMessageDetails } from '../../../utils/commit-message-details'
import { normalize_path } from '@/utils/normalize-path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { FilesCollector } from '@/utils/files-collector'

export const get_prompt_data = async (params: {
  repository: GitRepository
  stage_all_if_none_staged: boolean
  selection_state?: { files?: string[] }
  extension_context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
}) => {
  await vscode.workspace.saveAll()
  await params.repository.status()
  const was_empty_stage =
    (params.repository.state.indexChanges || []).length == 0
  const working_tree_changes = params.repository.state.workingTreeChanges || []
  const is_single_change = was_empty_stage && working_tree_changes.length == 1
  const diff = await prepare_staged_changes({
    repository: params.repository,
    stage_all_if_none_staged: params.stage_all_if_none_staged,
    selection_state: params.selection_state
  })
  if (!diff) return null

  const diff_file_paths: string[] = []
  const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '')
  for (const file_diff_content of file_diffs) {
    const full_file_diff = 'diff --git ' + file_diff_content
    const lines = full_file_diff.split('\n')
    const old_path_line = lines.find((l) => l.startsWith('--- a/'))
    const new_path_line = lines.find((l) => l.startsWith('+++ b/'))

    const old_path = old_path_line
      ? old_path_line.substring('--- a/'.length)
      : undefined
    const new_path = new_path_line
      ? new_path_line.substring('+++ b/'.length)
      : undefined

    let file_path: string | undefined
    if (new_path && new_path != '/dev/null') {
      file_path = new_path
    } else if (old_path && old_path != '/dev/null') {
      file_path = old_path
    } else {
      const match = lines[0]?.match(/^diff --git a\/(.*) b\/(.*)$/)
      if (match) {
        file_path = match[2]
      }
    }
    if (file_path && !diff_file_paths.includes(file_path)) {
      diff_file_paths.push(file_path)
    }
  }

  const workspace_root = params.repository.rootUri.fsPath
  const all_prompts =
    CommitMessageDetails.load_all(params.extension_context)[workspace_root] ||
    []

  const relevant_prompts = all_prompts.filter((p) =>
    p.files.some((file) => {
      const rel_path = path.isAbsolute(file)
        ? normalize_path(path.relative(workspace_root, file))
        : normalize_path(file)
      return (
        diff_file_paths.includes(rel_path) || diff_file_paths.includes(file)
      )
    })
  )

  const context_files_set = new Set<string>()
  for (const p of relevant_prompts) {
    for (const f of p.selected_files || []) {
      const rel_path = path.isAbsolute(f)
        ? normalize_path(path.relative(workspace_root, f))
        : normalize_path(f)
      if (!diff_file_paths.includes(rel_path) && !diff_file_paths.includes(f)) {
        context_files_set.add(rel_path)
      }
    }
  }

  const context_files = Array.from(context_files_set)

  const files_collector = new FilesCollector({
    workspace_provider: params.workspace_provider
  })

  const absolute_context_files = context_files.map((f) =>
    path.join(workspace_root, f)
  )

  const sorted_files = files_collector.sort_context_files({
    files: absolute_context_files
  })

  const ordered_context_files = [
    ...sorted_files.other_files,
    ...sorted_files.recent_files
  ].map((f) => {
    return normalize_path(path.relative(workspace_root, f))
  })

  const { api_prompt, chatbot_prompt } = await build_commit_message_prompt(
    diff,
    params.repository,
    ordered_context_files
  )

  return {
    repository: params.repository,
    was_empty_stage,
    api_prompt,
    chatbot_prompt,
    is_single_change,
    staged_files: diff_file_paths
  }
}

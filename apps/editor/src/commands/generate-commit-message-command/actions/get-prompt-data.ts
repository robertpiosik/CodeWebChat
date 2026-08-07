import * as vscode from 'vscode'
import {
  prepare_staged_changes,
  GitRepository
} from '../../../utils/git-repository-utils'
import { build_commit_message_prompt } from '../utils/build-commit-message-prompt'

export const get_prompt_data = async (params: {
  repository: GitRepository
  stage_all_if_none_staged: boolean
  selection_state?: { files?: string[] }
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
  const { api_prompt, chatbot_prompt } = await build_commit_message_prompt(
    diff,
    params.repository
  )

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

  return {
    repository: params.repository,
    was_empty_stage,
    api_prompt,
    chatbot_prompt,
    is_single_change,
    staged_files: diff_file_paths
  }
}

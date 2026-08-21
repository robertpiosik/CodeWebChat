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
import { t } from '@/i18n'
import { display_token_count } from '@/utils/display-token-count'
import { LAST_USE_CONTEXT_FILES_STATE_KEY } from '@/constants/state-keys'

export const get_prompt_data = async (params: {
  repository: GitRepository
  stage_all_if_none_staged: boolean
  selection_state?: { files?: string[] }
  extension_context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
  files_staged_by_action?: boolean
  is_single_change_flow?: boolean
  skip_context_prompt?: boolean
}) => {
  await vscode.workspace.saveAll()
  await params.repository.status()
  const current_empty_stage =
    (params.repository.state.indexChanges || []).length == 0
  const was_empty_stage = current_empty_stage || !!params.files_staged_by_action
  const working_tree_changes = params.repository.state.workingTreeChanges || []
  const is_single_change =
    params.is_single_change_flow !== undefined
      ? params.is_single_change_flow
      : current_empty_stage && working_tree_changes.length == 1
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

  const absolute_context_files = context_files.map((f) =>
    path.join(workspace_root, f)
  )

  const sorted_files = FilesCollector.sort_context_files({
    workspace_provider: params.workspace_provider,
    files: absolute_context_files
  })

  const ordered_context_files = [
    ...sorted_files.other_files,
    ...sorted_files.recent_files
  ].map((f) => {
    return normalize_path(path.relative(workspace_root, f))
  })

  let api_prompt = ''
  let chatbot_prompt = ''
  let was_context_prompt_shown = false

  if (ordered_context_files.length > 0 && !params.skip_context_prompt) {
    const setting = vscode.workspace
      .getConfiguration('codeWebChat')
      .get<string>('useContextFilesInCommitMessagePrompt', 'ask')

    if (setting === 'always') {
      const prompt = await build_commit_message_prompt(
        diff,
        params.repository,
        ordered_context_files
      )
      api_prompt = prompt.api_prompt
      chatbot_prompt = prompt.chatbot_prompt
    } else if (setting === 'ask') {
      const prompt_with_context = await build_commit_message_prompt(
        diff,
        params.repository,
        ordered_context_files
      )

      const prompt_without_context = await build_commit_message_prompt(
        diff,
        params.repository,
        []
      )

      const skip_tokens = Math.ceil(
        prompt_without_context.api_prompt.length / 4
      )
      const additional_tokens =
        Math.ceil(prompt_with_context.api_prompt.length / 4) - skip_tokens

      const attach_label = t(
        'command.generate-commit-message.attach-context-files.attach'
      )
      const skip_label = t(
        'command.generate-commit-message.attach-context-files.skip'
      )
      const last_selected_id =
        params.extension_context.workspaceState.get<string>(
          LAST_USE_CONTEXT_FILES_STATE_KEY,
          'attach'
        )

      const show_back_button =
        was_empty_stage && !is_single_change && !params.stage_all_if_none_staged

      was_context_prompt_shown = true

      const answer = await new Promise<string | undefined | 'back'>(
        (resolve) => {
          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { id: string }
          >()
          quick_pick.items = [
            {
              label: skip_label,
              description: `${display_token_count(skip_tokens)} tokens`,
              id: 'skip'
            },
            {
              label: attach_label,
              description: `+${display_token_count(additional_tokens)} tokens`,
              id: 'attach'
            }
          ]
          quick_pick.activeItems = [
            quick_pick.items.find((i) => i.id === last_selected_id) ||
              quick_pick.items[1]
          ]
          quick_pick.title = t(
            'command.generate-commit-message.attach-context-files.title'
          )
          quick_pick.placeholder = t(
            'command.generate-commit-message.attach-context-files.placeholder'
          )
          quick_pick.ignoreFocusOut = true
          const close_button = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
          quick_pick.buttons = [
            ...(show_back_button ? [vscode.QuickInputButtons.Back] : []),
            close_button
          ]

          let is_resolved = false

          quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              is_resolved = true
              resolve('back')
              quick_pick.hide()
            } else if (button === close_button) {
              is_resolved = true
              resolve(undefined)
              quick_pick.hide()
            }
          })

          quick_pick.onDidAccept(() => {
            is_resolved = true
            resolve(quick_pick.selectedItems[0]?.id)
            quick_pick.hide()
          })

          quick_pick.onDidHide(() => {
            if (!is_resolved) {
              resolve(undefined)
            }
            quick_pick.dispose()
          })

          quick_pick.show()
        }
      )

      if (answer === 'back') {
        if (was_empty_stage) {
          await vscode.commands.executeCommand(
            'git.unstageAll',
            params.repository
          )
        }
        return 'back'
      }

      if (answer === undefined) {
        if (was_empty_stage) {
          await vscode.commands.executeCommand(
            'git.unstageAll',
            params.repository
          )
        }
        return null
      }

      params.extension_context.workspaceState.update(
        LAST_USE_CONTEXT_FILES_STATE_KEY,
        answer
      )

      if (answer === 'attach') {
        api_prompt = prompt_with_context.api_prompt
        chatbot_prompt = prompt_with_context.chatbot_prompt
      } else {
        api_prompt = prompt_without_context.api_prompt
        chatbot_prompt = prompt_without_context.chatbot_prompt
      }
    } else {
      const prompt = await build_commit_message_prompt(
        diff,
        params.repository,
        []
      )
      api_prompt = prompt.api_prompt
      chatbot_prompt = prompt.chatbot_prompt
    }
  } else {
    const prompt = await build_commit_message_prompt(
      diff,
      params.repository,
      []
    )
    api_prompt = prompt.api_prompt
    chatbot_prompt = prompt.chatbot_prompt
  }

  return {
    repository: params.repository,
    was_empty_stage,
    api_prompt,
    chatbot_prompt,
    is_single_change,
    staged_files: diff_file_paths,
    was_context_prompt_shown
  }
}

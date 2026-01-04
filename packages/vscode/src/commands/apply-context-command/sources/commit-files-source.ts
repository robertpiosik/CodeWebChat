import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../../../constants/state-keys'
import { get_git_repository } from '@/utils/git-repository-utils'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'

export const handle_commit_files_source = async (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<'back' | void> => {
  try {
    const repository = await get_git_repository()
    if (!repository) {
      return
    }

    const log_output = execSync('git log -n 20 --pretty=format:"%H|%s|%ar"', {
      cwd: repository.rootUri.fsPath,
      encoding: 'utf-8'
    })
      .toString()
      .trim()

    if (!log_output) {
      vscode.window.showInformationMessage(
        'No commits found in the repository.'
      )
      return
    }

    const commits = log_output.split('\n').map((line) => {
      const [hash, subject, relative_date] = line.split('|')
      return {
        label: hash,
        detail: subject,
        description: relative_date,
        hash
      }
    })

    const quick_pick = vscode.window.createQuickPick<
      vscode.QuickPickItem & { hash: string }
    >()
    quick_pick.items = commits
    quick_pick.placeholder = 'Select a commit to load modified files from'
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const selected_commit = await new Promise<
      (vscode.QuickPickItem & { hash: string }) | 'back' | undefined
    >((resolve) => {
      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            resolve('back')
            quick_pick.hide()
          }
        }),
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems[0])
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve('back')
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )
      quick_pick.show()
    })

    if (selected_commit === 'back') {
      return 'back'
    }

    if (!selected_commit) {
      return
    }

    const files_output = execSync(
      `git show --name-only --pretty="" ${selected_commit.hash}`,
      {
        cwd: repository.rootUri.fsPath,
        encoding: 'utf-8'
      }
    )
      .toString()
      .trim()

    if (!files_output) {
      vscode.window.showInformationMessage('No files modified in this commit.')
      return
    }

    const files = files_output
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)

    const valid_files = files
      .map((f) => {
        const absolute_path = path.join(repository.rootUri.fsPath, f)
        return {
          relative_path: f,
          absolute_path,
          exists:
            fs.existsSync(absolute_path) && fs.statSync(absolute_path).isFile()
        }
      })
      .filter((f) => f.exists)

    if (valid_files.length === 0) {
      vscode.window.showInformationMessage(
        'No valid existing files found from this commit.'
      )
      return
    }

    const file_items = valid_files.map((f) => ({
      label: path.basename(f.relative_path),
      description: path.dirname(f.relative_path),
      picked: true,
      file_path: f.absolute_path
    }))

    const selected_files = await vscode.window.showQuickPick(file_items, {
      canPickMany: true,
      placeHolder: 'Select files to add to context',
      title: `Files modified in ${selected_commit.hash.substring(0, 7)}`
    })

    if (!selected_files || selected_files.length === 0) {
      return
    }

    const selected_paths = selected_files.map((item) => item.file_path)
    const currently_checked = workspace_provider.get_checked_files()
    let paths_to_apply = selected_paths

    if (currently_checked.length > 0) {
      const selected_paths_set = new Set(selected_paths)
      const all_current_files_in_new_context = currently_checked.every((file) =>
        selected_paths_set.has(file)
      )

      if (!all_current_files_in_new_context) {
        const quick_pick_options = [
          {
            label: 'Replace',
            description:
              'Replace the current context with files from this commit'
          },
          {
            label: 'Merge',
            description: 'Merge files from this commit with the current context'
          }
        ]

        const last_choice_label = extension_context.workspaceState.get<string>(
          LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
        )

        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = quick_pick_options
        quick_pick.placeholder = `How would you like to apply files from commit ${selected_commit.hash.substring(
          0,
          7
        )}?`

        if (last_choice_label) {
          const active_item = quick_pick_options.find(
            (opt) => opt.label === last_choice_label
          )
          if (active_item) {
            quick_pick.activeItems = [active_item]
          }
        }

        const choice = await new Promise<vscode.QuickPickItem | undefined>(
          (resolve) => {
            let is_accepted = false
            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            })
            quick_pick.onDidHide(() => {
              if (!is_accepted) resolve(undefined)
              quick_pick.dispose()
            })
            quick_pick.show()
          }
        )

        if (!choice) return

        await extension_context.workspaceState.update(
          LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
          choice.label
        )

        if (choice.label === 'Merge') {
          paths_to_apply = [
            ...new Set([...currently_checked, ...selected_paths])
          ]
        }
      }
    }

    await workspace_provider.set_checked_files(paths_to_apply)

    vscode.window.showInformationMessage(
      dictionary.information_message.SELECTED_FILES(paths_to_apply.length)
    )
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to load commit files: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    Logger.error({
      function_name: 'handle_commit_files_source',
      message: 'Error handling commit files source',
      data: error
    })
  }
}

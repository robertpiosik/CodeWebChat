import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { MODE } from '@/views/panel/types/main-view-mode'
import * as vscode from 'vscode'
import * as path from 'path'
import { execSync } from 'child_process'
import { dictionary } from '@shared/constants/dictionary'
import { load_and_merge_global_contexts } from '@/commands/apply-context-command/helpers/saving'
import { load_and_merge_file_contexts } from '@/commands/apply-context-command/sources'
import {
  LAST_SELECTED_CONTEXT_SOURCE_IN_SYMBOLS_QUICK_PICK_STATE_KEY,
  LAST_SELECTED_SYMBOL_STATE_KEY,
  LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY
} from '@/constants/state-keys'

const selection_label = '$(list-flat) Selection'
const changes_label = '$(git-pull-request-draft) Changes'
const commit_label = '$(git-commit) Commit'
const context_at_commit_label = '$(history) Context at commit'
const saved_context_label = '$(checklist) Saved context'

const handle_selection_item = async (): Promise<string> => {
  return '#Selection '
}

const handle_changes_item = async (): Promise<
  string | 'continue' | undefined
> => {
  try {
    const workspace_folders = vscode.workspace.workspaceFolders
    if (!workspace_folders || workspace_folders.length == 0) {
      vscode.window.showErrorMessage(
        dictionary.error_message.NO_WORKSPACE_FOLDERS_FOUND
      )
      return undefined
    }

    const all_branches = new Set<string>()
    const workspace_with_branches: Array<{
      folder: vscode.WorkspaceFolder
      branches: string[]
    }> = []

    for (const folder of workspace_folders) {
      try {
        const branches = execSync('git branch --sort=-committerdate', {
          encoding: 'utf-8',
          cwd: folder.uri.fsPath
        })
          .split('\n')
          .map((b) => b.trim().replace(/^\* /, ''))
          .filter((b) => b.length > 0)

        if (branches.length > 0) {
          workspace_with_branches.push({ folder, branches })
          branches.forEach((branch) => all_branches.add(branch))
        }
      } catch (error) {
        console.log(`Skipping ${folder.name}: not a Git repository`)
      }
    }

    if (all_branches.size == 0) {
      vscode.window.showErrorMessage(
        dictionary.error_message.NO_GIT_BRANCHES_FOUND_IN_WORKSPACE
      )
      return undefined
    }

    const branch_items: vscode.QuickPickItem[] = []

    if (workspace_with_branches.length == 1) {
      const { branches } = workspace_with_branches[0]
      branch_items.push(
        ...branches.map((branch) => ({
          label: branch
        }))
      )
    } else {
      // Multi-root workspace: include folder name with branch
      for (const { folder, branches } of workspace_with_branches) {
        branch_items.push(
          ...branches.map((branch) => ({
            label: `${folder.name}/${branch}`,
            description: folder.name
          }))
        )
      }
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = branch_items
    quick_pick.placeholder = 'Select branch to compare with'
    quick_pick.title = 'Branches'
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const selected_branch = await new Promise<
      vscode.QuickPickItem | 'back' | undefined
    >((resolve) => {
      let is_accepted = false
      let did_trigger_back = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            quick_pick.hide()
            resolve('back')
          }
        }),
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems[0])
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!is_accepted && !did_trigger_back) {
            resolve(undefined) // Esc
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )
      quick_pick.show()
    })

    if (selected_branch && selected_branch != 'back') {
      return `#Changes:${selected_branch.label} `
    }

    return 'continue'
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_GET_GIT_BRANCHES
    )
    return 'continue'
  }
}

const handle_commit_item = async (
  context: vscode.ExtensionContext,
  symbol: 'Commit' | 'ContextAtCommit'
): Promise<string | 'continue' | undefined> => {
  try {
    const workspace_folders = vscode.workspace.workspaceFolders
    if (!workspace_folders || workspace_folders.length == 0) {
      vscode.window.showErrorMessage(
        dictionary.error_message.NO_WORKSPACE_FOLDERS_FOUND
      )
      return undefined
    }

    const git_folders: vscode.WorkspaceFolder[] = []
    for (const folder of workspace_folders) {
      try {
        execSync('git rev-parse --is-inside-work-tree', {
          cwd: folder.uri.fsPath,
          stdio: 'ignore'
        })
        git_folders.push(folder)
      } catch (error) {
        console.log(`Skipping ${folder.name}: not a Git repository`)
      }
    }

    if (git_folders.length == 0) {
      vscode.window.showErrorMessage(
        'No Git repository found in the workspace.'
      )
      return undefined
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let selected_folder: vscode.WorkspaceFolder | undefined

      if (git_folders.length == 1) {
        selected_folder = git_folders[0]
      } else {
        const folder_items = git_folders.map((folder) => ({
          label: folder.name
        }))
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = folder_items
        quick_pick.placeholder = 'Select a repository'
        quick_pick.title = 'Repositories'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const last_repo = context.workspaceState.get<string>(
          LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY
        )
        if (last_repo) {
          const active = folder_items.find((item) => item.label === last_repo)
          if (active) quick_pick.activeItems = [active]
        }

        const picked_folder = await new Promise<
          vscode.QuickPickItem | 'back' | undefined
        >((resolve) => {
          let is_accepted = false
          let did_trigger_back = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                did_trigger_back = true
                quick_pick.hide()
                resolve('back')
              }
            }),
            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            }),
            quick_pick.onDidHide(() => {
              if (!is_accepted && !did_trigger_back) {
                resolve(undefined) // Esc
              }
              disposables.forEach((d) => d.dispose())
              quick_pick.dispose()
            })
          )
          quick_pick.show()
        })

        if (!picked_folder || picked_folder == 'back') return 'continue'

        await context.workspaceState.update(
          LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY,
          picked_folder.label
        )

        selected_folder = git_folders.find(
          (folder) => folder.name === picked_folder.label
        )
      }

      if (!selected_folder) {
        return 'continue'
      }

      const log_output = execSync(
        'git log --pretty=format:"%H%n%s%n%cr" -n 50',
        {
          encoding: 'utf-8',
          cwd: selected_folder.uri.fsPath
        }
      )

      if (!log_output.trim()) {
        vscode.window.showErrorMessage(
          `No git commits found in "${selected_folder.name}".`
        )
        if (git_folders.length > 1) {
          continue
        }
        return 'continue'
      }

      const commits_raw = log_output.trim().split('\n')
      const commit_items: vscode.QuickPickItem[] = []
      for (let i = 0; i < commits_raw.length; i += 3) {
        const hash = commits_raw[i]
        const message = commits_raw[i + 1] || ''
        const date = commits_raw[i + 2] || ''
        if (hash) {
          commit_items.push({ label: hash, detail: message, description: date })
        }
      }

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = commit_items
      quick_pick.placeholder = 'Select a commit to reference'
      quick_pick.title = 'Commits'
      quick_pick.buttons = [vscode.QuickInputButtons.Back]
      quick_pick.matchOnDetail = true

      const selected_commit = await new Promise<
        vscode.QuickPickItem | 'back' | undefined
      >((resolve) => {
        let is_accepted = false
        let did_trigger_back = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              did_trigger_back = true
              quick_pick.hide()
              resolve('back')
            }
          }),
          quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(quick_pick.selectedItems[0])
            quick_pick.hide()
          }),
          quick_pick.onDidHide(() => {
            if (!is_accepted && !did_trigger_back) {
              resolve(undefined) // Esc
            }
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          })
        )
        quick_pick.show()
      })

      if (!selected_commit || selected_commit == 'back') {
        if (git_folders.length > 1) {
          continue
        }
        return 'continue'
      }

      if (selected_commit) {
        const message = (selected_commit.detail || '').replace(/"/g, '\\"')
        return `#${symbol}:${selected_folder.name}:${
          selected_commit.label
        } "${message}" `
      }

      return 'continue'
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      'Failed to get git commits. Please ensure git is installed.'
    )
    return 'continue'
  }
}

const handle_saved_context_item = async (
  context: vscode.ExtensionContext
): Promise<string | 'continue' | undefined> => {
  try {
    const workspace_folders = vscode.workspace.workspaceFolders || []
    if (workspace_folders.length == 0) {
      vscode.window.showErrorMessage(dictionary.error_message.NO_WORKSPACE_ROOT)
      return undefined
    }

    const { merged: internal_contexts, context_to_roots: internal_roots } =
      load_and_merge_global_contexts(context)
    const { merged: file_contexts, context_to_roots: file_roots } =
      await load_and_merge_file_contexts()

    const source_options: (vscode.QuickPickItem & {
      value: 'WorkspaceState' | 'JSON'
    })[] = []
    if (internal_contexts.length > 0) {
      source_options.push({
        label: 'Workspace State',
        description: `${internal_contexts.length} context${
          internal_contexts.length == 1 ? '' : 's'
        }`,
        value: 'WorkspaceState'
      })
    }
    if (file_contexts.length > 0) {
      source_options.push({
        label: 'JSON File (.vscode/contexts.json)',
        description: `${file_contexts.length} context${
          file_contexts.length == 1 ? '' : 's'
        }`,
        value: 'JSON'
      })
    }

    if (source_options.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_SAVED_CONTEXTS_FOUND
      )
      return 'continue'
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let source: 'WorkspaceState' | 'JSON' | undefined
      if (source_options.length > 1) {
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { value: 'WorkspaceState' | 'JSON' }
        >()
        quick_pick.items = source_options
        quick_pick.placeholder = 'Select context source'
        quick_pick.title = 'Context Sources'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const last_source = context.workspaceState.get<string>(
          LAST_SELECTED_CONTEXT_SOURCE_IN_SYMBOLS_QUICK_PICK_STATE_KEY
        )
        if (last_source) {
          const active = source_options.find(
            (item) => item.value == last_source
          )
          if (active) quick_pick.activeItems = [active]
        }

        const selection = await new Promise<
          | (vscode.QuickPickItem & { value: 'WorkspaceState' | 'JSON' })
          | 'back'
          | undefined
        >((resolve) => {
          let is_accepted = false
          let did_trigger_back = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                did_trigger_back = true
                quick_pick.hide()
                resolve('back')
              }
            }),
            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            }),
            quick_pick.onDidHide(() => {
              if (!is_accepted && !did_trigger_back) {
                resolve(undefined) // Esc
              }
              disposables.forEach((d) => d.dispose())
              quick_pick.dispose()
            })
          )
          quick_pick.show()
        })

        if (!selection || selection == 'back') return 'continue'

        await context.workspaceState.update(
          LAST_SELECTED_CONTEXT_SOURCE_IN_SYMBOLS_QUICK_PICK_STATE_KEY,
          selection.value
        )

        source = selection.value
      } else {
        source = source_options[0].value
      }

      if (!source) return 'continue'

      const contexts_to_use =
        source == 'WorkspaceState' ? internal_contexts : file_contexts
      const roots_map = source == 'WorkspaceState' ? internal_roots : file_roots

      const is_multi_root = workspace_folders.length > 1

      const context_items: vscode.QuickPickItem[] = []

      if (contexts_to_use.length > 0) {
        context_items.push({
          label:
            source == 'WorkspaceState' ? 'recent entries' : 'entries (A-Z)',
          kind: vscode.QuickPickItemKind.Separator
        })
      }

      context_items.push(
        ...contexts_to_use.map((ctx) => {
          const roots = roots_map.get(ctx.name) || []
          let description = `${ctx.paths.length} path${
            ctx.paths.length == 1 ? '' : 's'
          }`

          if (roots.length > 0 && (roots.length > 1 || is_multi_root)) {
            const workspace_names = roots.map((root) => {
              const folder = workspace_folders.find(
                (f) => f.uri.fsPath === root
              )
              return folder?.name || path.basename(root)
            })
            description += ` · ${workspace_names.join(', ')}`
          }

          return {
            label: ctx.name,
            description
          }
        })
      )

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = context_items
      quick_pick.placeholder = 'Select a saved context'
      quick_pick.title = 'Saved Contexts'
      quick_pick.buttons = [vscode.QuickInputButtons.Back]

      const selected_context = await new Promise<
        vscode.QuickPickItem | 'back' | undefined
      >((resolve) => {
        let is_accepted = false
        let did_trigger_back = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              did_trigger_back = true
              quick_pick.hide()
              resolve('back')
            }
          }),
          quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(quick_pick.selectedItems[0])
            quick_pick.hide()
          }),
          quick_pick.onDidHide(() => {
            if (!is_accepted && !did_trigger_back) {
              resolve(undefined) // Esc
            }
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          })
        )
        quick_pick.show()
      })

      // Fix: Treat undefined (Esc) same as 'back' to navigate up one level
      if (!selected_context || selected_context == 'back') {
        if (source_options.length > 1) {
          continue
        }
        return 'continue'
      }

      if (selected_context) {
        return `#SavedContext:${source} "${selected_context.label}" `
      }

      return 'continue'
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      'Failed to load saved contexts. Please check your configuration.'
    )
    return 'continue'
  }
}

const hash_sign_quick_pick = async (params: {
  context: vscode.ExtensionContext
  is_for_code_completions: boolean
  is_prune_context: boolean
}): Promise<string | undefined> => {
  let items: vscode.QuickPickItem[] = [
    {
      label: selection_label,
      description: 'Text selection from the active editor'
    },
    {
      label: changes_label,
      description: 'Diff with the selected branch'
    },
    {
      label: commit_label,
      description: 'Diff from a specific commit'
    },
    {
      label: context_at_commit_label,
      description: 'Older versions of the currently selected files'
    },
    {
      label: saved_context_label,
      description: 'Files from the workspace'
    }
  ]

  if (params.is_prune_context) {
    items = items.filter(
      (item) =>
        item.label !== context_at_commit_label &&
        item.label !== saved_context_label
    )
  }

  const last_selected_symbol = params.context.workspaceState.get<string>(
    LAST_SELECTED_SYMBOL_STATE_KEY
  )
  let last_selected_item: vscode.QuickPickItem | undefined = items.find(
    (item) => item.label == last_selected_symbol
  )

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.placeholder = 'Select symbol to insert'
    quick_pick.matchOnDescription = true
    quick_pick.title = 'Symbols'
    quick_pick.buttons = [
      { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
    ]

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    }

    const selected = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        let is_accepted = false
        quick_pick.onDidTriggerButton(() => {
          quick_pick.hide()
        })
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems[0])
          quick_pick.hide()
        })
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
          }
          quick_pick.dispose()
        })
        quick_pick.show()
      }
    )

    if (!selected) {
      return
    }

    last_selected_item = selected
    await params.context.workspaceState.update(
      LAST_SELECTED_SYMBOL_STATE_KEY,
      selected.label
    )

    let result: string | 'continue' | undefined

    switch (selected.label) {
      case selection_label:
        result = await handle_selection_item()
        break
      case changes_label:
        result = await handle_changes_item()
        break
      case commit_label:
        result = await handle_commit_item(params.context, 'Commit')
        break
      case context_at_commit_label:
        result = await handle_commit_item(params.context, 'ContextAtCommit')
        break
      case saved_context_label:
        result = await handle_saved_context_item(params.context)
        break
      default:
        continue
    }

    if (result == 'continue') {
      continue
    }

    return result
  }
}

export const handle_hash_sign_quick_pick = async (
  panel_provider: PanelProvider,
  context: vscode.ExtensionContext,
  is_for_code_completions: boolean
): Promise<void> => {
  const is_prune_context =
    (panel_provider.mode == MODE.WEB &&
      panel_provider.web_prompt_type == 'prune-context') ||
    (panel_provider.mode == MODE.API &&
      panel_provider.api_prompt_type == 'prune-context')

  const replacement = await hash_sign_quick_pick({
    context,
    is_for_code_completions,
    is_prune_context
  })

  if (!replacement) {
    panel_provider.send_message({
      command: 'FOCUS_PROMPT_FIELD'
    })
    return
  }

  let current_text = ''

  const mode =
    panel_provider.mode == MODE.WEB
      ? panel_provider.web_prompt_type
      : panel_provider.api_prompt_type
  if (mode == 'ask-about-context') {
    current_text = panel_provider.ask_about_context_instructions
  } else if (mode == 'edit-context') {
    current_text = panel_provider.edit_context_instructions
  } else if (mode == 'no-context') {
    current_text = panel_provider.no_context_instructions
  } else if (mode == 'code-at-cursor') {
    current_text = panel_provider.code_at_cursor_instructions
  } else if (mode == 'prune-context') {
    current_text = panel_provider.prune_context_instructions
  }

  const is_after_hash_sign = current_text
    .slice(0, panel_provider.caret_position)
    .endsWith('#')
  if (is_after_hash_sign) {
    panel_provider.add_text_at_cursor_position(replacement, 1)
  } else {
    panel_provider.add_text_at_cursor_position(replacement)
  }

  panel_provider.send_message({
    command: 'FOCUS_PROMPT_FIELD'
  })
}

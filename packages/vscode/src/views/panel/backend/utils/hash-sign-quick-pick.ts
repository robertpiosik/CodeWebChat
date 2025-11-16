import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { dictionary } from '@shared/constants/dictionary'
import { SAVED_CONTEXTS_STATE_KEY } from '@/constants/state-keys'
import { SavedContext } from '@/types/context'

const selection_label = '$(list-flat) Selection'
const changes_label = '$(git-pull-request-draft) Changes'
const commit_label = '$(git-commit) Commit'
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

    if (workspace_with_branches.length === 1) {
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

    const selected_branch = await vscode.window.showQuickPick(branch_items, {
      placeHolder: 'Select branch to compare with'
    })

    if (selected_branch) {
      return `#Changes:${selected_branch.label} `
    } else {
      return 'continue'
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_GET_GIT_BRANCHES
    )
    return 'continue'
  }
}

const handle_commit_item = async (): Promise<
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

    let selected_folder: vscode.WorkspaceFolder | undefined

    if (git_folders.length == 1) {
      selected_folder = git_folders[0]
    } else {
      const folder_items = git_folders.map((folder) => ({
        label: folder.name
      }))
      const picked_folder = await vscode.window.showQuickPick(folder_items, {
        placeHolder: 'Select a repository'
      })

      if (!picked_folder) {
        return 'continue'
      }
      selected_folder = git_folders.find(
        (folder) => folder.name == picked_folder.label
      )
    }

    if (!selected_folder) {
      return 'continue'
    }

    const log_output = execSync('git log --pretty=format:"%H%n%s" -n 50', {
      encoding: 'utf-8',
      cwd: selected_folder.uri.fsPath
    })

    if (!log_output.trim()) {
      vscode.window.showErrorMessage(
        `No git commits found in "${selected_folder.name}".`
      )
      return 'continue'
    }

    const commits_raw = log_output.trim().split('\n')
    const commit_items: vscode.QuickPickItem[] = []
    for (let i = 0; i < commits_raw.length; i += 2) {
      const hash = commits_raw[i]
      const message = commits_raw[i + 1] || ''
      if (hash) {
        commit_items.push({ label: hash, detail: message })
      }
    }

    const selected_commit = await vscode.window.showQuickPick(commit_items, {
      placeHolder: 'Select a commit to reference'
    })

    if (selected_commit) {
      return `#Commit:${selected_folder.name}:${selected_commit.label} "${selected_commit.detail}" `
    } else {
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
  const workspace_root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspace_root) {
    vscode.window.showErrorMessage(dictionary.error_message.NO_WORKSPACE_ROOT)
    return undefined
  }

  const internal_contexts: SavedContext[] =
    context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, []) || []

  const contexts_file_path = path.join(
    workspace_root,
    '.vscode',
    'contexts.json'
  )
  let file_contexts: SavedContext[] = []
  if (fs.existsSync(contexts_file_path)) {
    try {
      const content = fs.readFileSync(contexts_file_path, 'utf8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        file_contexts = parsed.filter(
          (item: any): item is SavedContext =>
            typeof item == 'object' &&
            item !== null &&
            typeof item.name == 'string' &&
            Array.isArray(item.paths) &&
            item.paths.every((p: any) => typeof p == 'string')
        )
      }
    } catch (e) {
      /* ignore */
    }
  }

  const source_options: (vscode.QuickPickItem & {
    value: 'WorkspaceState' | 'JSON'
  })[] = []
  if (internal_contexts.length > 0) {
    source_options.push({
      label: 'Workspace State',
      description: `${internal_contexts.length} context${
        internal_contexts.length === 1 ? '' : 's'
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
    return undefined
  }

  const source =
    source_options.length > 1
      ? (
          await vscode.window.showQuickPick(source_options, {
            placeHolder: 'Select context source'
          })
        )?.value
      : source_options[0].value

  if (!source) return 'continue'

  const contexts_to_use =
    source == 'WorkspaceState' ? internal_contexts : file_contexts

  const context_items = contexts_to_use.map((ctx) => ({
    label: ctx.name,
    description: `${ctx.paths.length} path${ctx.paths.length == 1 ? '' : 's'}`
  }))

  const selected_context = await vscode.window.showQuickPick(context_items, {
    placeHolder: 'Select a saved context'
  })

  if (selected_context) {
    return `#SavedContext:${source} "${selected_context.label}" `
  }
  return 'continue'
}

export const hash_sign_quick_pick = async (params: {
  context: vscode.ExtensionContext
  is_for_code_completions: boolean
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
      label: saved_context_label,
      description: 'XML-formatted files'
    }
  ]

  if (params.is_for_code_completions) {
    items = items.filter((item) => item.label === saved_context_label)
  }

  let last_selected_item: vscode.QuickPickItem | undefined

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.placeholder = 'Select symbol to insert'
    quick_pick.matchOnDescription = true

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    }

    const selected = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        let is_accepted = false
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

    let result: string | 'continue' | undefined

    switch (selected.label) {
      case selection_label:
        result = await handle_selection_item()
        break
      case changes_label:
        result = await handle_changes_item()
        break
      case commit_label:
        result = await handle_commit_item()
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

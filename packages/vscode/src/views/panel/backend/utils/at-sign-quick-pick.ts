import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { SAVED_CONTEXTS_STATE_KEY } from '../../../../constants/state-keys'
import { SavedContext } from '../../../../types/context'
import { dictionary } from '@shared/constants/dictionary'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'

export async function at_sign_quick_pick(params: {
  context: vscode.ExtensionContext
  is_for_code_completions: boolean
  workspace_provider: WorkspaceProvider
  allow_reference_context_item: boolean
}): Promise<string | undefined> {
  let items = [
    {
      label: 'Reference path from context',
      description: 'Places folder or file path in the input field'
    },
    {
      label: '#Selection',
      description:
        'Places symbol that is then replaced by text selection from the active editor'
    },
    {
      label: '#Changes',
      description:
        'Places symbol that is then replaced by a diff of changes between the selected branch'
    },
    {
      label: '#SavedContext',
      description:
        'Places symbol that is then replaced by files from a saved context'
    }
  ]

  if (params.allow_reference_context_item == false) {
    items = items.filter((item) => item.label != 'Reference path from context')
  }

  if (params.is_for_code_completions) {
    items = items.filter(
      (item) =>
        item.label == '#SavedContext' ||
        item.label == 'Reference path from context'
    )
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select symbol to insert',
      matchOnDescription: true
    })

    if (!selected) {
      return
    }

    if (selected.label == 'Reference path from context') {
      const checked_paths = params.workspace_provider.get_all_checked_paths()
      if (checked_paths.length == 0) {
        vscode.window.showInformationMessage('Nothing is selected in context.')
        return
      }

      const workspace_roots = params.workspace_provider.getWorkspaceRoots()

      const quick_pick_items = checked_paths.map((p) => {
        let relative_path = p
        const root = params.workspace_provider.get_workspace_root_for_file(p)
        if (root) {
          if (workspace_roots.length > 1) {
            const ws_name = params.workspace_provider.get_workspace_name(root)
            relative_path = path.join(ws_name, path.relative(root, p))
          } else {
            relative_path = path.relative(root, p)
          }
        }
        return { label: relative_path.replace(/\\/g, '/') }
      })

      quick_pick_items.sort((a, b) => natural_sort(a.label, b.label))

      const selected_path_item = await vscode.window.showQuickPick(
        quick_pick_items,
        {
          placeHolder: 'Select a path to place in the input field'
        }
      )

      if (selected_path_item) {
        return `\`${selected_path_item.label}\` `
      }
      continue
    }

    if (selected.label == '#Selection') {
      return '#Selection '
    }

    if (selected.label == '#Changes') {
      try {
        const workspace_folders = vscode.workspace.workspaceFolders
        if (!workspace_folders || workspace_folders.length == 0) {
          vscode.window.showErrorMessage(
            dictionary.error_message.NO_WORKSPACE_FOLDERS_FOUND
          )
          return
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
          return
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

        const selected_branch = await vscode.window.showQuickPick(
          branch_items,
          {
            placeHolder: 'Select branch to compare with'
          }
        )

        if (selected_branch) {
          // For single root workspace, keep existing format
          if (workspace_with_branches.length === 1) {
            return `#Changes:${selected_branch.label} `
          } else {
            // For multi-root workspace, return format: changes:[folder name]/[branch name]
            return `#Changes:${selected_branch.label} `
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_GET_GIT_BRANCHES
        )
      }
      continue
    }

    if (selected.label == '#SavedContext') {
      const workspace_root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      if (!workspace_root) {
        vscode.window.showErrorMessage(
          dictionary.error_message.NO_WORKSPACE_ROOT
        )
        return
      }

      const internal_contexts: SavedContext[] =
        params.context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, []) || []

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
            file_contexts.length === 1 ? '' : 's'
          }`,
          value: 'JSON'
        })
      }

      if (source_options.length === 0) {
        vscode.window.showInformationMessage(
          dictionary.information_message.NO_SAVED_CONTEXTS_FOUND
        )
        return
      }

      const source =
        source_options.length > 1
          ? (
              await vscode.window.showQuickPick(source_options, {
                placeHolder: 'Select context source'
              })
            )?.value
          : source_options[0].value

      if (!source) continue

      const contexts_to_use =
        source == 'WorkspaceState' ? internal_contexts : file_contexts

      const context_items = contexts_to_use.map((ctx) => ({
        label: ctx.name,
        description: `${ctx.paths.length} path${
          ctx.paths.length == 1 ? '' : 's'
        }`
      }))

      const selected_context = await vscode.window.showQuickPick(
        context_items,
        {
          placeHolder: 'Select a saved context'
        }
      )

      if (selected_context) {
        return `#SavedContext:${source} "${selected_context.label}" `
      }
      continue
    }
  }
}

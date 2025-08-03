import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { SAVED_CONTEXTS_STATE_KEY } from '../constants/state-keys'
import { SavedContext } from '../types/context'
import { RecentFileManager } from '@/services/recent-files-manager'

export async function at_sign_quick_pick(
  context: vscode.ExtensionContext,
  is_code_completions_mode = false
): Promise<string | undefined> {
  let items = [
    {
      label: '@File',
      description: 'Reference a file'
    },
    {
      label: '@Selection',
      description: 'Text selection of the active editor'
    },
    {
      label: '@Changes',
      description: 'Diff between the current branch and the selected branch'
    },
    {
      label: '@SavedContext',
      description: 'Files from a saved context'
    }
  ]

  if (is_code_completions_mode) {
    items = items.filter(
      (item) => item.label != '@Selection' && item.label != '@Changes'
    )
  }

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select symbol to insert',
    matchOnDescription: true
  })

  if (!selected) {
    return
  }
  if (selected.label == '@File') {
    const workspace_folders = vscode.workspace.workspaceFolders
    if (!workspace_folders || workspace_folders.length == 0) {
      vscode.window.showErrorMessage('No workspace folders found')
      return
    }
    const workspace_root = workspace_folders[0].uri.fsPath

    return new Promise((resolve) => {
      const quickPick = vscode.window.createQuickPick<{ label: string; description?: string; path: string; uri: vscode.Uri }>();
      quickPick.placeholder = 'Search for a file by name';

      let debounceTimeout: NodeJS.Timeout;

      // Helper function to create a QuickPickItem for a file
      function createFileQuickPickItem(fileUri: vscode.Uri, workspaceRoot: string): vscode.QuickPickItem & { path: string; uri: vscode.Uri } {
        const relativePath = path.relative(workspaceRoot, fileUri.fsPath);
        return {
          label: path.basename(fileUri.fsPath),
          description: path.dirname(relativePath),
          path: relativePath,
          uri: fileUri
        };
      }

      const recentFileManager = new RecentFileManager(context);
      const recentFiles = recentFileManager.getRecentFileUris().map(uri => createFileQuickPickItem(uri, workspace_root));

      // Initially, show only recent files
      quickPick.items = recentFiles;

      quickPick.onDidChangeValue(value => {
        clearTimeout(debounceTimeout);
        
        // When user clears the input, show recent files again
        if (!value || value.length < 1) {
          quickPick.busy = false;
          quickPick.items = recentFiles;
          return;
        }

        quickPick.busy = true; // Show loading indicator

        // Debounce the search to avoid excessive API calls
        debounceTimeout = setTimeout(async () => {
          const query = `**/*${value}*`;
          const searchResults = await vscode.workspace.findFiles(query, undefined, 100);

          if (searchResults) {
            quickPick.items = searchResults.map(uri => createFileQuickPickItem(uri, workspace_root));
          }
          quickPick.busy = false;
        }, 300); // 300ms debounce delay
      });

      quickPick.onDidAccept(() => {
        const selectedFile = quickPick.selectedItems[0];
        if (selectedFile) {
          resolve(`File:${selectedFile.path} `);
          recentFileManager.addFile(selectedFile.uri)
        }

        quickPick.hide();
      });
      
      quickPick.onDidHide(() => {
        clearTimeout(debounceTimeout);
        quickPick.dispose();
        resolve(undefined); // Resolve with undefined if the user dismisses the picker
      });

      quickPick.show();
    });
  }

  if (selected.label == '@Selection') {
    return 'Selection '
  }

  if (selected.label == '@Changes') {
    try {
      const workspace_folders = vscode.workspace.workspaceFolders
      if (!workspace_folders || workspace_folders.length == 0) {
        vscode.window.showErrorMessage('No workspace folders found')
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
          'No Git branches found in any workspace folder'
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

      const selected_branch = await vscode.window.showQuickPick(branch_items, {
        placeHolder: 'Select branch to compare with'
      })

      if (selected_branch) {
        // For single root workspace, keep existing format
        if (workspace_with_branches.length === 1) {
          return `Changes:${selected_branch.label} `
        } else {
          // For multi-root workspace, return format: changes:[folder name]/[branch name]
          return `Changes:${selected_branch.label} `
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        'Failed to get Git branches. Make sure you are in a Git repository.'
      )
    }
  }

  if (selected.label == '@SavedContext') {
    const workspace_root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!workspace_root) {
      vscode.window.showErrorMessage('No workspace root found.')
      return
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
          file_contexts.length === 1 ? '' : 's'
        }`,
        value: 'JSON'
      })
    }

    if (source_options.length === 0) {
      vscode.window.showInformationMessage('No saved contexts found.')
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

    if (!source) return

    const contexts_to_use =
      source === 'WorkspaceState' ? internal_contexts : file_contexts

    const context_items = contexts_to_use.map((ctx) => ({
      label: ctx.name,
      description: `${ctx.paths.length} path${
        ctx.paths.length === 1 ? '' : 's'
      }`
    }))

    const selected_context = await vscode.window.showQuickPick(context_items, {
      placeHolder: 'Select a saved context'
    })

    if (selected_context) {
      return `SavedContext:${source} "${selected_context.label}" `
    }
  }

  return undefined
}

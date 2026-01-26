import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { dictionary } from '@shared/constants/dictionary'

export const handle_changes_item = async (): Promise<
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
            resolve(undefined)
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )
      quick_pick.show()
    })

    if (selected_branch && selected_branch != 'back') {
      return `#Changes(${selected_branch.label})`
    }

    return 'continue'
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_GET_GIT_BRANCHES
    )
    return 'continue'
  }
}

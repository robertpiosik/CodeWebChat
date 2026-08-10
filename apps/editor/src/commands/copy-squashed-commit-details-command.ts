import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { get_git_repository } from '@/utils/git-repository-utils'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { AsciiTree } from '@/utils/ascii-tree'

export const copy_squashed_commit_details_command = (): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.copySquashedCommitDetails',
    async () => {
      try {
        const repository = await get_git_repository()
        if (!repository) {
          return
        }

        let branches_output: string = ''
        try {
          branches_output = execSync(`git branch --sort=-committerdate`, {
            cwd: repository.rootUri.fsPath,
            encoding: 'utf-8'
          })
            .toString()
            .trim()
        } catch (e) {
          // Error handled below
        }

        if (!branches_output) {
          vscode.window.showInformationMessage(
            t('command.copy-squashed-commit-details.no-branches')
          )
          return
        }

        const branches = branches_output
          .split('\n')
          .filter((line) => !line.startsWith('* '))
          .map((line) => {
            const name = line.trim()
            return {
              label: name,
              name
            }
          })
          .filter((b) => b.name.length > 0)

        if (branches.length === 0) {
          vscode.window.showInformationMessage(
            t('command.copy-squashed-commit-details.no-other-branches')
          )
          return
        }

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { name: string }
        >()
        quick_pick.title = t('command.copy-squashed-commit-details.title')
        quick_pick.items = branches
        quick_pick.placeholder = t(
          'command.copy-squashed-commit-details.select'
        )
        quick_pick.matchOnDetail = true
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
        ]

        const selected_branch = await new Promise<
          (vscode.QuickPickItem & { name: string }) | undefined
        >((resolve) => {
          let is_accepted = false
          const disposables: vscode.Disposable[] = []

          disposables.push(
            quick_pick.onDidTriggerButton(() => {
              resolve(undefined)
              quick_pick.hide()
            }),
            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            }),
            quick_pick.onDidHide(() => {
              if (!is_accepted) {
                resolve(undefined)
              }
              disposables.forEach((d) => d.dispose())
              quick_pick.dispose()
            })
          )
          quick_pick.show()
        })

        if (!selected_branch) {
          return
        }

        let log_output = ''
        try {
          log_output = execSync(
            `git log ${selected_branch.name}..HEAD --pretty=format:"%s%n%b%n%x00"`,
            {
              cwd: repository.rootUri.fsPath,
              encoding: 'utf-8'
            }
          )
            .toString()
            .trim()
        } catch (e) {
          vscode.window.showErrorMessage('Failed to fetch commit logs.')
          return
        }

        if (!log_output) {
          vscode.window.showInformationMessage(
            t('command.copy-squashed-commit-details.no-commits')
          )
          return
        }

        const commits = log_output
          .split('\x00')
          .filter((c) => c.trim().length > 0)
        const bullets = new Set<string>()

        for (const commit of commits) {
          const lines = commit
            .trim()
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0)

          if (lines.length === 0) continue

          const subject = lines[0]
          const commit_bullets = lines.filter(
            (l) => l.startsWith('- ') || l.startsWith('* ')
          )

          if (commit_bullets.length > 0) {
            commit_bullets.forEach((b) =>
              bullets.add(b.replace(/^[-*]\s+/, '- '))
            )
          } else {
            bullets.add(`- ${subject}`)
          }
        }

        const final_bullets = Array.from(bullets).join('\n')

        const extracted_paths = AsciiTree.extract_paths(log_output)
        let tree_text = ''
        if (extracted_paths.length > 0) {
          tree_text = AsciiTree.generate(extracted_paths)
        }

        const final_text = `${final_bullets}${tree_text ? '\n\n' + tree_text : ''}`

        await vscode.env.clipboard.writeText(final_text)
        vscode.window.showInformationMessage(
          t('command.copy-squashed-commit-details.copied')
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to copy squashed commit details: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'copy_squashed_commit_details_command',
          message: 'Error handling copy squashed commit details command',
          data: error
        })
      }
    }
  )
}

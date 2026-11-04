import * as vscode from 'vscode'
import axios from 'axios'
import { t } from '../i18n'
import { update_extension } from '../utils/update-extension'

export const install_specific_version_command = () => {
  return vscode.commands.registerCommand(
    'codeWebChat.installSpecificVersion',
    async () => {
      const tags: any[] = []
      let page = 1

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t(
            'command.install-specific-version-command.fetching-versions'
          ),
          cancellable: false
        },
        async () => {
          while (true) {
            try {
              const res = await axios.get(
                `https://api.github.com/repos/CodeWebChat/CWC/tags?page=${page}&per_page=100`,
                { validateStatus: () => true }
              )
              if (
                res.status !== 200 ||
                !Array.isArray(res.data) ||
                res.data.length === 0
              ) {
                break
              }

              const vscode_tags = res.data.filter((tag: any) =>
                tag.name?.endsWith('-vscode')
              )
              tags.push(...vscode_tags)

              if (res.data.length < 100) {
                break
              }
              page++
            } catch (e) {
              console.error('Failed to fetch tags', e)
              break
            }
          }
        }
      )

      if (tags.length === 0) {
        vscode.window.showWarningMessage(
          t('command.install-specific-version-command.something-went-wrong')
        )
        return
      }

      const items = tags.map((tag) => {
        const version = tag.name.replace('-vscode', '')
        let description = tag.commit?.sha?.substring(0, 7)

        const parts = version.split('.')
        if (
          parts.length >= 2 &&
          parts[0].length === 4 &&
          parts[1].length === 4
        ) {
          const year = parseInt(parts[0], 10)
          const month = parseInt(parts[1].substring(0, 2), 10)
          const day = parseInt(parts[1].substring(2, 4), 10)
          const date = new Date(year, month - 1, day)

          if (!isNaN(date.getTime())) {
            const age_days = Math.floor(
              (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (age_days <= 0) {
              description = t(
                'command.install-specific-version-command.date.today'
              )
            } else if (age_days === 1) {
              description = t(
                'command.install-specific-version-command.date.one-day-ago'
              )
            } else if (age_days < 30) {
              description = t(
                'command.install-specific-version-command.date.days-ago',
                {
                  days: age_days
                }
              )
            } else {
              const age_months = Math.floor(age_days / 30)
              if (age_months === 1) {
                description = t(
                  'command.install-specific-version-command.date.one-month-ago'
                )
              } else {
                description = t(
                  'command.install-specific-version-command.date.months-ago',
                  {
                    months: age_months
                  }
                )
              }
            }
          }
        }

        return {
          label: version,
          description,
          tag: tag.name,
          sha: tag.commit?.sha,
          buttons: [
            {
              iconPath: new vscode.ThemeIcon('globe'),
              tooltip: t(
                'command.install-specific-version-command.action.open-release-page'
              )
            }
          ]
        }
      })

      const quick_pick = vscode.window.createQuickPick<
        vscode.QuickPickItem & { tag: string; sha?: string }
      >()
      quick_pick.title = t('command.install-specific-version-command.title')
      quick_pick.placeholder = t(
        'command.install-specific-version-command.select-version'
      )
      quick_pick.items = items
      quick_pick.matchOnDetail = true
      quick_pick.ignoreFocusOut = true

      const close_button: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('common.close')
      }
      quick_pick.buttons = [close_button]

      quick_pick.onDidTriggerButton((button) => {
        if (button === close_button) {
          quick_pick.hide()
        }
      })

      quick_pick.onDidTriggerItemButton((e) => {
        vscode.env.openExternal(
          vscode.Uri.parse(
            `https://github.com/CodeWebChat/CWC/releases/tag/${e.item.tag}`
          )
        )
        quick_pick.activeItems = [e.item]
      })

      quick_pick.onDidAccept(() => {
        const selected = quick_pick.selectedItems[0]
        if (selected && selected.sha) {
          quick_pick.hide()
          update_extension({ commit_sha: selected.sha })
        }
      })

      quick_pick.onDidHide(() => {
        quick_pick.dispose()
      })

      quick_pick.show()
    }
  )
}

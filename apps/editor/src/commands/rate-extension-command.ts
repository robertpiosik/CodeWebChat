import * as vscode from 'vscode'
import { t } from '@/i18n'

export const rate_extension_command = () => {
  return vscode.commands.registerCommand(
    'codeWebChat.rateExtension',
    async () => {
      const quick_pick = vscode.window.createQuickPick<
        vscode.QuickPickItem & { url: string }
      >()
      quick_pick.title = t('command.rate.title')
      quick_pick.placeholder = t('command.rate.placeholder')

      quick_pick.items = [
        {
          label: 'VS Code Marketplace',
          description: 'marketplace.visualstudio.com',
          url: 'https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder'
        },
        {
          label: 'Chrome Web Store',
          description: 'chromewebstore.google.com',
          url: 'https://chromewebstore.google.com/detail/autofill-for-code-web-chat/ljookipcanaglfaocjbgdicfbdhhjffp'
        },
        {
          label: 'Firefox Add-ons',
          description: 'addons.mozilla.org',
          url: 'https://addons.mozilla.org/en-US/firefox/addon/autofill-for-code-web-chat/'
        }
      ]

      const close_button = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('common.close')
      }

      quick_pick.buttons = [close_button]

      quick_pick.onDidTriggerButton((button) => {
        if (button === close_button) {
          quick_pick.hide()
        }
      })

      quick_pick.onDidAccept(() => {
        const selected = quick_pick.selectedItems[0]
        if (selected && selected.url) {
          vscode.env.openExternal(vscode.Uri.parse(selected.url))
          quick_pick.hide()
        }
      })

      quick_pick.onDidHide(() => {
        quick_pick.dispose()
      })

      quick_pick.show()
    }
  )
}

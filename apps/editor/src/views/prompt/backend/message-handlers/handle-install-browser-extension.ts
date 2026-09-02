import * as vscode from 'vscode'
import { t } from '@/i18n'

export const handle_install_browser_extension = async (): Promise<void> => {
  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { url: string }
  >()
  quick_pick.title = t('command.install-browser-extension.title')
  quick_pick.placeholder = t('command.install-browser-extension.placeholder')

  quick_pick.items = [
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

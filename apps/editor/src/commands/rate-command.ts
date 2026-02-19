import * as vscode from 'vscode'

export function rate_command() {
  return vscode.commands.registerCommand('codeWebChat.rate', () => {
    const options = [
      {
        label: 'VS Code Marketplace',
        url: 'https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder&ssr=false#review-details'
      },
      {
        label: 'Chrome Web Store',
        url: 'https://chromewebstore.google.com/detail/autofill-for-code-web-cha/ljookipcanaglfaocjbgdicfbdhhjffp'
      },
      {
        label: 'Firefox Add-ons',
        url: 'https://addons.mozilla.org/en-US/firefox/addon/autofill-for-code-web-chat/'
      }
    ]

    const quick_pick = vscode.window.createQuickPick<(typeof options)[0]>()
    quick_pick.items = options
    quick_pick.title = 'Rate Extension'
    quick_pick.placeholder = 'Select platform'
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
    ]

    quick_pick.onDidTriggerButton(() => {
      quick_pick.hide()
    })

    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0]
      if (selected) {
        vscode.env.openExternal(vscode.Uri.parse(selected.url))
      }
      quick_pick.hide()
    })

    quick_pick.onDidHide(() => quick_pick.dispose())
    quick_pick.show()
  })
}

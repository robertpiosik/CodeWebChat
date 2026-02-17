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

    const quickPick = vscode.window.createQuickPick<(typeof options)[0]>()
    quickPick.items = options
    quickPick.title = 'Rate Extension'
    quickPick.placeholder = 'How do you like CWC?'
    quickPick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
    ]

    quickPick.onDidTriggerButton(() => {
      quickPick.hide()
    })

    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems[0]
      if (selected) {
        vscode.env.openExternal(vscode.Uri.parse(selected.url))
      }
      quickPick.hide()
    })

    quickPick.onDidHide(() => quickPick.dispose())
    quickPick.show()
  })
}

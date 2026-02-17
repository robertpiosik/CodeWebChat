import * as vscode from 'vscode'

export function rate_command() {
  return vscode.commands.registerCommand('codeWebChat.rate', async () => {
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

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: 'Rate the tool'
    })

    if (selected) {
      vscode.env.openExternal(vscode.Uri.parse(selected.url))
    }
  })
}

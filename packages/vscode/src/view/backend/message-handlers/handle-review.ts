import * as vscode from 'vscode'

export const handle_review = async (): Promise<void> => {
  const options = [
    {
      label: 'Visual Studio Marketplace',
      url: 'https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder&ssr=false#review-details'
    },
    {
      label: 'Chrome Web Store',
      url: 'https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp/reviews'
    },
    {
      label: 'Firefox Add-ons',
      url: 'https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/'
    }
  ]

  const selected_option = await vscode.window.showQuickPick(options, {
    placeHolder: 'Where would you like to leave a review?'
  })

  if (selected_option) {
    vscode.env.openExternal(vscode.Uri.parse(selected_option.url))
  }
}

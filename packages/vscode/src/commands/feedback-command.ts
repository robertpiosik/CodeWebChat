import * as vscode from 'vscode'

const show_rating_options = async (): Promise<void> => {
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
      url: 'https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/reviews/'
    }
  ]

  const selected_option = await vscode.window.showQuickPick(options, {
    placeHolder: 'Where would you like to rate the extension?'
  })

  if (selected_option) {
    vscode.env.openExternal(vscode.Uri.parse(selected_option.url))
  }
}

const feedback = async (): Promise<void> => {
  const main_options = [
    {
      label: 'Report an issue or request a feature',
      action: 'report'
    },
    {
      label: 'Rate the extension',
      action: 'rate'
    }
  ]

  const selected_option = await vscode.window.showQuickPick(main_options, {
    placeHolder: 'How would you like to provide feedback?'
  })

  if (selected_option) {
    if (selected_option.action == 'report') {
      vscode.env.openExternal(
        vscode.Uri.parse(
          'https://github.com/robertpiosik/CodeWebChat/discussions'
        )
      )
    } else if (selected_option.action == 'rate') {
      await show_rating_options()
    }
  }
}

export const feedback_command = () =>
  vscode.commands.registerCommand('codeWebChat.feedback', feedback)

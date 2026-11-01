import * as vscode from 'vscode'
import * as os from 'os'

export const handle_update_extension = () => {
  const terminal = vscode.window.createTerminal('CodeWebChat Update')
  terminal.show()

  if (os.platform() === 'win32') {
    terminal.sendText(
      'powershell -c "irm https://raw.githubusercontent.com/robertpiosik/CodeWebChat/main/install.ps1 | iex"',
      false
    )
  } else {
    terminal.sendText(
      'curl -fsSL https://raw.githubusercontent.com/robertpiosik/CodeWebChat/main/install.sh | bash',
      false
    )
  }
}

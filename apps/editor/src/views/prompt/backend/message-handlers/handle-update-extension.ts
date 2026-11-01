import * as vscode from 'vscode'
import * as os from 'os'

export const handle_update_extension = () => {
  const terminal = vscode.window.createTerminal('CodeWebChat Update')
  terminal.show()

  const uriScheme = vscode.env.uriScheme

  if (os.platform() === 'win32') {
    terminal.sendText(
      `powershell -c "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/robertpiosik/CodeWebChat/main/install.ps1))) '${uriScheme}'"`
    )
  } else {
    terminal.sendText(
      `curl -fsSL https://raw.githubusercontent.com/robertpiosik/CodeWebChat/main/install.sh | bash -s -- "${uriScheme}"`
    )
  }
}

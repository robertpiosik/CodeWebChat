import * as vscode from 'vscode'
import * as os from 'os'

export const update_extension = (sha?: string) => {
  const terminal = vscode.window.createTerminal('CWC Updater')
  terminal.show()

  const uriScheme = vscode.env.uriScheme
  const lang = vscode.env.language
  const commitSha = sha || ''

  if (os.platform() === 'win32') {
    terminal.sendText(
      `powershell -c "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/CodeWebChat/CWC/main/install.ps1))) '${uriScheme}' '${lang}' '${commitSha}'"`
    )
  } else {
    terminal.sendText(
      `curl -fsSL https://raw.githubusercontent.com/CodeWebChat/CWC/main/install.sh | bash -s -- "${uriScheme}" "${lang}" "${commitSha}"`
    )
  }
}

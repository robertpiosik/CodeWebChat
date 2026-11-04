import * as vscode from 'vscode'
import * as os from 'os'

export const update_extension = (params: { tag_name: string }) => {
  const terminal = vscode.window.createTerminal('CWC Updater')
  terminal.show()

  const uri_scheme = vscode.env.uriScheme
  const lang = vscode.env.language

  if (os.platform() === 'win32') {
    terminal.sendText(
      `powershell -c "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/CodeWebChat/CWC/main/install.ps1))) '${uri_scheme}' '${lang}' '${params.tag_name}'"`
    )
  } else {
    terminal.sendText(
      `curl -fsSL https://raw.githubusercontent.com/CodeWebChat/CWC/main/install.sh | bash -s -- "${uri_scheme}" "${lang}" "${params.tag_name}"`
    )
  }
}

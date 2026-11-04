import * as vscode from 'vscode'
import * as os from 'os'

export const update_extension = async (params: { tag_name: string }) => {
  const terminal = vscode.window.createTerminal('CWC Updater')
  terminal.show()

  const uri_scheme = vscode.env.uriScheme
  const lang = vscode.env.language

  const command =
    os.platform() === 'win32'
      ? `powershell -c "& ([scriptblock]::Create((irm https://github.com/CodeWebChat/CWC/raw/refs/heads/main/install.ps1))) -editor '${uri_scheme}' -lang '${lang}' -tag '${params.tag_name}'"; exit $LASTEXITCODE`
      : `curl -fsSL https://github.com/CodeWebChat/CWC/raw/refs/heads/main/install.sh | bash -s -- --editor "${uri_scheme}" --lang "${lang}" --tag "${params.tag_name}" && exit`

  const terminal_closed = new Promise<vscode.TerminalExitStatus | undefined>(
    (resolve) => {
      const disposable = vscode.window.onDidCloseTerminal((t) => {
        if (t === terminal) {
          disposable.dispose()
          resolve(t.exitStatus)
        }
      })
    }
  )

  terminal.sendText(command)

  await terminal_closed
  vscode.commands.executeCommand('workbench.action.reloadWindow')
}

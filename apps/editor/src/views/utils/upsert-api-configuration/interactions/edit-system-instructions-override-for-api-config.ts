import * as vscode from 'vscode'
import { ApiConfiguration } from '@/services/model-providers-manager'

export const edit_system_instructions_override_for_api_configuration = async (
  api_configuration: ApiConfiguration
): Promise<string | null | undefined> => {
  return await new Promise<string | null | undefined>((resolve) => {
    const input = vscode.window.createInputBox()
    input.title = 'Edit API Configuration'
    input.value = api_configuration.system_instructions_override ?? ''
    input.prompt = 'Enter system instructions.'

    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input.onDidAccept(() => {
        const value = input.value
        if (value.trim() == '') {
          accepted = true
          resolve(null)
          input.hide()
          return
        }
        accepted = true
        resolve(value)
        input.hide()
      }),
      input.onDidHide(() => {
        if (!accepted) resolve(undefined)
        disposables.forEach((d) => d.dispose())
        input.dispose()
      })
    )
    input.show()
  })
}

import * as vscode from 'vscode'
import { ToolConfig } from '@/services/model-providers-manager'

export const edit_temperature_for_config = async (
  config: ToolConfig
): Promise<number | null | undefined> => {
  return await new Promise<number | null | undefined>((resolve) => {
    const input = vscode.window.createInputBox()
    input.title = 'Edit Configuration'
    input.value = config.temperature?.toString() ?? ''
    input.prompt = 'Enter a value between 0 and 2.'
    input.placeholder = 'Temperature'

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
        const num = parseFloat(value)
        if (isNaN(num) || num < 0 || num > 2) {
          input.validationMessage = 'Please enter a number between 0 and 2.'
          return
        }
        accepted = true
        resolve(num)
        input.hide()
      }),
      input.onDidChangeValue((value) => {
        if (value.trim() == '') {
          input.validationMessage = undefined
          return
        }
        const num = parseFloat(value)
        if (isNaN(num) || num < 0 || num > 2) {
          input.validationMessage = 'Please enter a number between 0 and 2.'
        } else {
          input.validationMessage = undefined
        }
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

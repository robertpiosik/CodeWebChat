import * as vscode from 'vscode'
import { t } from '@/i18n'

export const ask_for_new_context_name = async (
  with_back_button: boolean
): Promise<string | 'back' | undefined> => {
  const input_box = vscode.window.createInputBox()
  input_box.title = t('command.apply-context.ask-name.title')
  input_box.prompt = t('command.apply-context.ask-name.prompt')
  input_box.placeholder = t('command.apply-context.ask-name.placeholder')

  return new Promise((resolve) => {
    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input_box.onDidAccept(() => {
        const value = input_box.value.trim()
        if (value.length == 0) {
          input_box.validationMessage = t(
            'command.apply-context.ask-name.empty'
          )
          return
        }
        accepted = true
        resolve(value)
        input_box.hide()
      }),
      input_box.onDidHide(() => {
        if (!accepted) {
          if (with_back_button) {
            resolve('back')
          } else {
            resolve(undefined) // Esc pressed
          }
        }
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }),
      input_box.onDidChangeValue(() => {
        input_box.validationMessage = ''
      })
    )
    input_box.show()
  })
}

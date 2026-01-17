import * as vscode from 'vscode'

const PROMPT_ENTER_CONTEXT_NAME = 'Enter a name for this context'
const PLACEHOLDER_CONTEXT_NAME = 'e.g., Backend API Context'
const VALIDATION_CONTEXT_NAME_EMPTY = 'Context name cannot be empty.'

export const ask_for_new_context_name = async (
  with_back_button: boolean
): Promise<string | 'back' | undefined> => {
  const input_box = vscode.window.createInputBox()
  input_box.title = 'New Entry'
  input_box.prompt = PROMPT_ENTER_CONTEXT_NAME
  input_box.placeholder = PLACEHOLDER_CONTEXT_NAME

  return new Promise((resolve) => {
    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input_box.onDidAccept(() => {
        const value = input_box.value.trim()
        if (value.length == 0) {
          input_box.validationMessage = VALIDATION_CONTEXT_NAME_EMPTY
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

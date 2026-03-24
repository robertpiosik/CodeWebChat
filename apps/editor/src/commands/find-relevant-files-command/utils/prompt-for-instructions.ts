import * as vscode from 'vscode'
import { t } from '@/i18n'

export const prompt_for_instructions = async (
  initial_value: string
): Promise<string | undefined> => {
  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }
  const input_box = vscode.window.createInputBox()
  input_box.title = t('command.find-relevant-files.input.title')
  input_box.prompt = t('command.find-relevant-files.input.prompt')
  input_box.placeholder = t('command.find-relevant-files.input.placeholder')
  input_box.value = initial_value
  input_box.buttons = [close_button]

  return new Promise<string | undefined>((resolve) => {
    let is_resolved = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input_box.onDidTriggerButton((button) => {
        if (button === close_button) {
          resolve(undefined)
          input_box.hide()
        }
      }),
      input_box.onDidAccept(() => {
        is_resolved = true
        resolve(input_box.value)
        input_box.hide()
      }),
      input_box.onDidHide(() => {
        if (!is_resolved) {
          resolve(undefined)
        }
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      })
    )
    input_box.show()
  })
}

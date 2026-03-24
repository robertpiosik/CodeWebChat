import * as vscode from 'vscode'
import { t } from '@/i18n'

export const prompt_for_search_term = async (
  initial_search_term: string
): Promise<{ value: string | undefined }> => {
  const close_button = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }

  const input_box = vscode.window.createInputBox()
  input_box.title = t('command.search.title')
  input_box.prompt = t('command.search.prompt')
  input_box.placeholder = t('command.search.placeholder')
  input_box.value = initial_search_term
  input_box.buttons = [close_button]

  return new Promise<{ value: string | undefined }>((resolve) => {
    let is_resolved = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      input_box.onDidTriggerButton((button) => {
        if (button === close_button) {
          resolve({ value: undefined })
          input_box.hide()
        }
      }),
      input_box.onDidAccept(() => {
        const value = input_box.value.trim()
        if (value.length === 0) {
          input_box.validationMessage = t('command.search.validation-empty')
          return
        }
        is_resolved = true
        resolve({ value })
        input_box.hide()
      }),
      input_box.onDidChangeValue(() => {
        if (input_box.value.trim().length > 0) {
          input_box.validationMessage = undefined
        }
      }),
      input_box.onDidHide(() => {
        if (!is_resolved) {
          resolve({ value: undefined })
        }
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      })
    )
    input_box.show()
  })
}

import * as vscode from 'vscode'

export const edit_reasoning_effort_for_config = async (
  current_effort?: string
) => {
  const effort_options: vscode.QuickPickItem[] = [
    {
      label: 'Unset',
      description: 'Remove reasoning effort from the configuration'
    }
  ]

  effort_options.push(
    { label: 'None' },
    { label: 'Minimal' },
    { label: 'Low' },
    { label: 'Medium' },
    { label: 'High' }
  )

  return await new Promise<string | null | undefined>((resolve) => {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = effort_options
    quick_pick.title = 'Edit Configuration'
    quick_pick.placeholder = 'Select reasoning effort'
    quick_pick.buttons = [vscode.QuickInputButtons.Back]
    if (current_effort) {
      const active = effort_options.find(
        (item) => item.label.toLowerCase() === current_effort.toLowerCase()
      )
      if (active) quick_pick.activeItems = [active]
    }

    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      quick_pick.onDidAccept(() => {
        accepted = true
        const selected = quick_pick.selectedItems[0]
        if (selected) {
          resolve(
            selected.label == 'Unset' ? null : selected.label.toLowerCase()
          )
        } else {
          resolve(undefined)
        }
        quick_pick.hide()
      }),
      quick_pick.onDidTriggerButton((button) => {
        if (button === vscode.QuickInputButtons.Back) {
          quick_pick.hide()
        }
      }),
      quick_pick.onDidHide(() => {
        if (!accepted) resolve(undefined)
        disposables.forEach((d) => d.dispose())
        quick_pick.dispose()
      })
    )
    quick_pick.show()
  })
}

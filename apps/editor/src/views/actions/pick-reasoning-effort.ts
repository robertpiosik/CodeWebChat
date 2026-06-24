import * as vscode from 'vscode'

export const pick_reasoning_effort = async (params: {
  supported_efforts: string[]
  current_effort?: string
}): Promise<{ effort: string } | undefined> => {
  const items: (vscode.QuickPickItem & { effort: string })[] =
    params.supported_efforts.map((effort) => ({
      label: effort.charAt(0).toUpperCase() + effort.slice(1),
      effort
    }))

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = 'Reasoning Efforts'
  quick_pick.placeholder = 'Choose a reasoning effort'

  if (params.current_effort) {
    const active_item = items.find((i) => i.effort === params.current_effort)
    if (active_item) quick_pick.activeItems = [active_item]
  } else {
    quick_pick.activeItems = [items[0]]
  }

  quick_pick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: 'Close'
    }
  ]

  quick_pick.onDidTriggerButton((button) => {
    if (button.tooltip == 'Close') {
      quick_pick.hide()
    }
  })

  return new Promise<{ effort: string } | undefined>((resolve) => {
    let accepted = false
    quick_pick.onDidAccept(() => {
      accepted = true
      const selected = quick_pick.selectedItems[0] as any
      quick_pick.hide()
      resolve(selected ? { effort: selected.effort } : undefined)
    })

    quick_pick.onDidHide(() => {
      if (!accepted) resolve(undefined)
      quick_pick.dispose()
    })

    quick_pick.show()
  })
}

import * as vscode from 'vscode'
import { AGENTS } from '@/constants/agents'
import { ConfigAgentConfigurationFormat } from '@/utils/cli-configuration-format-converters'
import { generate_unique_name } from '@/views/shared/utils/generate-unique-name'
import { t } from '@/i18n'

export const create = async (params: {
  reference_index?: number
  exact_insertion?: boolean
}): Promise<
  { config: ConfigAgentConfigurationFormat; insertion_index?: number } | undefined
> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_agent_configurations =
    config.get<ConfigAgentConfigurationFormat[]>('agents', []) || []

  let insertion_index: number | undefined = params.reference_index

  if (params.reference_index !== undefined && !params.exact_insertion) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          { label: t('common.placement-above') },
          { label: t('common.placement-below') }
        ]
        quick_pick.title = t('views.shared.actions.placement.title')
        quick_pick.placeholder = t('views.shared.actions.placement.placeholder')
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
        ]

        let accepted = false
        const disposables: vscode.Disposable[] = []

        disposables.push(
          quick_pick.onDidTriggerButton(() => {
            quick_pick.hide()
          }),
          quick_pick.onDidAccept(() => {
            accepted = true
            resolve(quick_pick.selectedItems[0]?.label)
            quick_pick.hide()
          }),
          quick_pick.onDidHide(() => {
            if (!accepted) resolve(undefined)
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          })
        )

        quick_pick.show()
      }
    )

    if (!position_quick_pick) return undefined

    insertion_index =
      position_quick_pick == t('common.placement-above')
        ? params.reference_index
        : params.reference_index + 1
  }

  const selected_agent = await new Promise<keyof typeof AGENTS | undefined>(
    (resolve) => {
      const agents = Object.entries(AGENTS)
      const items: vscode.QuickPickItem[] = agents.map(([agent]) => ({
        label: agent
      }))

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = items
      quick_pick.title = t('common.title.agents')
      quick_pick.placeholder = t(
        'views.shared.actions.agent.create.agents.placeholder'
      )
      quick_pick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
        }
      ]

      let accepted = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton(() => {
          quick_pick.hide()
        }),
        quick_pick.onDidAccept(() => {
          accepted = true
          const agent = quick_pick.selectedItems[0]?.label as keyof typeof AGENTS
          quick_pick.hide()
          resolve(agent)
        }),
        quick_pick.onDidHide(() => {
          if (!accepted) resolve(undefined)
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )

      quick_pick.show()
    }
  )

  if (!selected_agent) return undefined

  const new_name = generate_unique_name(
    undefined,
    current_agent_configurations.map((c) => c.name)
  )

  const new_agent_configuration: ConfigAgentConfigurationFormat = {
    name: new_name,
    agent: selected_agent
  }

  return { config: new_agent_configuration, insertion_index }
}
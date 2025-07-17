import * as vscode from 'vscode'
import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY,
  PINNED_HISTORY_ASK_STATE_KEY,
  PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY,
  PINNED_HISTORY_EDIT_STATE_KEY,
  PINNED_HISTORY_NO_CONTEXT_STATE_KEY
} from '@/constants/state-keys'
import { ViewProvider } from '@/view/backend/view-provider'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'
import { InstructionsMessage } from '@/view/types/messages'
import { ApiMode, WebMode } from '@shared/types/modes'
import { handle_get_history } from './handle-get-history'

type PromptTemplate = {
  name?: string
  template: string
}

export const handle_show_history_quick_pick = async (
  provider: ViewProvider
): Promise<void> => {
  const mode: WebMode | ApiMode | undefined =
    provider.home_view_type == HOME_VIEW_TYPES.WEB
      ? provider.web_mode
      : provider.api_mode

  if (!mode) {
    return
  }

  let history_key: string | undefined,
    pinned_history_key: string | undefined,
    prompt_templates_key: string | undefined
  switch (mode) {
    case 'ask':
      history_key = HISTORY_ASK_STATE_KEY
      pinned_history_key = PINNED_HISTORY_ASK_STATE_KEY
      prompt_templates_key = 'promptTemplatesForAskAboutContext'
      break
    case 'edit':
      history_key = HISTORY_EDIT_STATE_KEY
      pinned_history_key = PINNED_HISTORY_EDIT_STATE_KEY
      prompt_templates_key = 'promptTemplatesForEditContext'
      break
    case 'code-completions':
      history_key = HISTORY_CODE_COMPLETIONS_STATE_KEY
      pinned_history_key = PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY
      prompt_templates_key = 'promptTemplatesForCodeAtCursor'
      break
    case 'no-context':
      history_key = HISTORY_NO_CONTEXT_STATE_KEY
      pinned_history_key = PINNED_HISTORY_NO_CONTEXT_STATE_KEY
      prompt_templates_key = 'promptTemplatesForNoContext'
      break
  }

  if (!history_key || !pinned_history_key || !prompt_templates_key) return

  const config = vscode.workspace.getConfiguration('codeWebChat')
  let prompt_templates =
    config.get<PromptTemplate[]>(prompt_templates_key, []) || []
  const history =
    provider.context.workspaceState.get<string[]>(history_key, []) || []
  const pinned_history =
    provider.context.workspaceState.get<string[]>(pinned_history_key, []) || []

  if (
    !history.length &&
    !pinned_history.length &&
    prompt_templates.length == 0
  ) {
    vscode.window.showInformationMessage(
      'No history or templates to show for the current mode.'
    )
    return
  }

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.placeholder = 'Search prompt history or select a template'

  const to_quick_pick_item = (
    text: string,
    list: 'recents' | 'pinned',
    is_pinned: boolean,
    pinned_index?: number,
    total_pinned?: number,
    is_searching?: boolean
  ): vscode.QuickPickItem => ({
    label: text,
    buttons: [
      ...(list == 'pinned' &&
      pinned_index !== undefined &&
      total_pinned !== undefined &&
      total_pinned > 1
        ? is_searching
          ? []
          : [
              ...(pinned_index > 0
                ? [
                    {
                      iconPath: new vscode.ThemeIcon('chevron-up'),
                      tooltip: 'Move up'
                    }
                  ]
                : []),
              ...(pinned_index < total_pinned - 1
                ? [
                    {
                      iconPath: new vscode.ThemeIcon('chevron-down'),
                      tooltip: 'Move down'
                    }
                  ]
                : [])
            ]
        : []),
      ...(!is_pinned
        ? [
            {
              iconPath: new vscode.ThemeIcon('pinned'),
              tooltip: 'Add to Pinned Prompts'
            }
          ]
        : []),
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip:
          list == 'pinned'
            ? 'Remove from Pinned Prompts'
            : 'Remove from Recent Prompts'
      }
    ]
  })

  const items: vscode.QuickPickItem[] = []
  let current_search_value = ''

  items.push({
    label: `$(symbol-namespace) My prompt templates`,
    alwaysShow: true
  })

  if (pinned_history.length > 0) {
    items.push({
      label: 'pinned',
      kind: vscode.QuickPickItemKind.Separator
    })
    items.push(
      ...pinned_history.map((item, index) =>
        to_quick_pick_item(item, 'pinned', true, index, pinned_history.length)
      )
    )
  }

  if (history.length > 0) {
    items.push({
      label: 'recent',
      kind: vscode.QuickPickItemKind.Separator
    })
    items.push(
      ...history.map((item) =>
        to_quick_pick_item(
          item,
          'recents',
          !!pinned_history.find((i) => i == item)
        )
      )
    )
  }

  quick_pick.items = items

  if (history.length > 0) {
    const firstRecentItemIndex = items.findIndex((item, index) => {
      const recentSeparatorIndex = items.findIndex(
        (i) =>
          i.label === 'recent' && i.kind == vscode.QuickPickItemKind.Separator
      )
      return (
        recentSeparatorIndex != -1 &&
        index > recentSeparatorIndex &&
        item.kind != vscode.QuickPickItemKind.Separator
      )
    })
    if (firstRecentItemIndex != -1) {
      quick_pick.activeItems = [items[firstRecentItemIndex]]
    }
  }

  const set_instructions = async (text: string) => {
    let instruction_key: string
    switch (mode) {
      case 'ask':
        provider.ask_instructions = text
        instruction_key = 'ask-instructions'
        break
      case 'edit':
        provider.edit_instructions = text
        instruction_key = 'edit-instructions'
        break
      case 'no-context':
        provider.no_context_instructions = text
        instruction_key = 'no-context-instructions'
        break
      case 'code-completions':
        provider.code_completions_instructions = text
        instruction_key = 'code-completions-instructions'
        break
      default:
        return
    }

    await provider.context.workspaceState.update(instruction_key, text)
    provider.send_message<InstructionsMessage>({
      command: 'INSTRUCTIONS',
      ask: provider.ask_instructions,
      edit: provider.edit_instructions,
      no_context: provider.no_context_instructions,
      code_completions: provider.code_completions_instructions
    })
  }

  const disposables: vscode.Disposable[] = []

  disposables.push(
    quick_pick.onDidAccept(async () => {
      const [selected_item] = quick_pick.selectedItems
      if (selected_item) {
        if (selected_item.label == `$(symbol-namespace) My prompt templates`) {
          quick_pick.hide()

          let template_accepted = false
          let is_editing_template = false

          const templates_quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { template?: PromptTemplate; index?: number }
          >()
          templates_quick_pick.placeholder =
            'Manage and use your prompt templates'

          const edit_button = {
            iconPath: new vscode.ThemeIcon('edit'),
            tooltip: 'Edit template'
          }
          const delete_button = {
            iconPath: new vscode.ThemeIcon('trash'),
            tooltip: 'Delete template'
          }
          const move_up_button = {
            iconPath: new vscode.ThemeIcon('chevron-up'),
            tooltip: 'Move up'
          }
          const move_down_button = {
            iconPath: new vscode.ThemeIcon('chevron-down'),
            tooltip: 'Move down'
          }

          const create_template_items = (templates: PromptTemplate[]) => {
            const items: (vscode.QuickPickItem & {
              template?: PromptTemplate
              index?: number
            })[] = [
              {
                label: '$(add) Add new template',
                alwaysShow: true
              }
            ]
            if (templates.length > 0) {
              items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator
              })
              items.push(
                ...templates.map((template, index) => {
                  const buttons = []
                  if (templates.length > 1) {
                    if (index > 0) buttons.push(move_up_button)
                    if (index < templates.length - 1)
                      buttons.push(move_down_button)
                  }
                  buttons.push(edit_button, delete_button)

                  return {
                    label: template.name || template.template.substring(0, 80),
                    description: template.name
                      ? template.template.substring(0, 100)
                      : undefined,
                    detail: template.template,
                    buttons,
                    template,
                    index
                  }
                })
              )
            }
            return items
          }

          templates_quick_pick.items = create_template_items(prompt_templates)

          const templates_disposables: vscode.Disposable[] = []
          templates_disposables.push(
            templates_quick_pick.onDidAccept(async () => {
              const [selected_template] = templates_quick_pick.selectedItems
              if (!selected_template) {
                return
              }

              if (selected_template.label == '$(add) Add new template') {
                const name = await vscode.window.showInputBox({
                  prompt: 'Enter an optional name for the template.'
                })
                if (name === undefined) return

                const templateText = await vscode.window.showInputBox({
                  prompt: 'Enter the prompt template.',
                  placeHolder:
                    'E.g., Rewrite {function name} without redundant comments.'
                })
                if (templateText === undefined) return

                if (templateText) {
                  const newTemplate: PromptTemplate = { template: templateText }
                  if (name) {
                    newTemplate.name = name
                  }
                  prompt_templates = [...prompt_templates, newTemplate]
                  await config.update(
                    prompt_templates_key,
                    prompt_templates,
                    vscode.ConfigurationTarget.Global
                  )
                  templates_quick_pick.items =
                    create_template_items(prompt_templates)
                }
              } else if (
                'template' in selected_template &&
                selected_template.template
              ) {
                template_accepted = true
                templates_quick_pick.hide()
                let prompt_text = selected_template.template.template
                const variable_regex = /\{([^{}]+)\}/g
                const matches = [...prompt_text.matchAll(variable_regex)]
                const variables = [
                  ...new Set(matches.map((match) => match[1].trim()))
                ]

                if (variables.length > 0) {
                  for (const variable of variables) {
                    const value = await vscode.window.showInputBox({
                      prompt: `Enter a value for "${variable}"`
                    })

                    if (value === undefined) {
                      return // User cancelled
                    }

                    const regex = new RegExp(
                      `\\{\\s*${variable.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                      )}\\s*\\}`,
                      'g'
                    )
                    prompt_text = prompt_text.replace(regex, value)
                  }
                }

                await set_instructions(prompt_text)
              }
            }),
            templates_quick_pick.onDidTriggerItemButton(async (event) => {
              const item = event.item as vscode.QuickPickItem & {
                template: PromptTemplate
                index: number
              }

              if (event.button === edit_button) {
                is_editing_template = true
                const new_name = await vscode.window.showInputBox({
                  prompt: 'Enter an optional name for the template.',
                  value: item.template.name
                })

                if (new_name !== undefined) {
                  const new_template_text = await vscode.window.showInputBox({
                    prompt: 'Enter the prompt template.',
                    value: item.template.template
                  })

                  if (new_template_text !== undefined) {
                    const updated_template: PromptTemplate = {
                      template: new_template_text
                    }
                    if (new_name) {
                      updated_template.name = new_name
                    }

                    prompt_templates[item.index] = updated_template
                    await config.update(
                      prompt_templates_key,
                      prompt_templates,
                      vscode.ConfigurationTarget.Global
                    )
                    templates_quick_pick.items =
                      create_template_items(prompt_templates)
                  }
                }
                is_editing_template = false
                templates_quick_pick.show()
              } else if (event.button === delete_button) {
                prompt_templates.splice(item.index, 1)
                await config.update(
                  prompt_templates_key,
                  prompt_templates,
                  vscode.ConfigurationTarget.Global
                )
                templates_quick_pick.items =
                  create_template_items(prompt_templates)
              } else if (event.button === move_up_button) {
                if (item.index > 0) {
                  const temp = prompt_templates[item.index - 1]
                  prompt_templates[item.index - 1] =
                    prompt_templates[item.index]
                  prompt_templates[item.index] = temp
                  await config.update(
                    prompt_templates_key,
                    prompt_templates,
                    vscode.ConfigurationTarget.Global
                  )
                  templates_quick_pick.items =
                    create_template_items(prompt_templates)
                }
              } else if (event.button === move_down_button) {
                if (item.index < prompt_templates.length - 1) {
                  const temp = prompt_templates[item.index + 1]
                  prompt_templates[item.index + 1] =
                    prompt_templates[item.index]
                  prompt_templates[item.index] = temp
                  await config.update(
                    prompt_templates_key,
                    prompt_templates,
                    vscode.ConfigurationTarget.Global
                  )
                  templates_quick_pick.items =
                    create_template_items(prompt_templates)
                }
              }
            }),
            templates_quick_pick.onDidHide(() => {
              if (is_editing_template) {
                // We are editing a template, which involves showing input boxes that hide the quick pick.
                // We don't want to dispose of everything in this case.
                return
              }

              templates_disposables.forEach((d) => d.dispose())
              if (!template_accepted) {
                handle_show_history_quick_pick(provider)
              }
            })
          )

          templates_quick_pick.show()
          return
        }
        await set_instructions(selected_item.label)
      }
      quick_pick.hide()
    }),
    quick_pick.onDidTriggerItemButton(async (e) => {
      const item_to_handle = e.item
      const button_tooltip = e.button.tooltip
      const item_text = item_to_handle.label

      if (button_tooltip == 'Move up') {
        const current_index = pinned_history.indexOf(item_text)
        if (current_index > 0) {
          const temp = pinned_history[current_index - 1]
          pinned_history[current_index - 1] = pinned_history[current_index]
          pinned_history[current_index] = temp

          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Move down') {
        const current_index = pinned_history.indexOf(item_text)
        if (current_index < pinned_history.length - 1) {
          const temp = pinned_history[current_index + 1]
          pinned_history[current_index + 1] = pinned_history[current_index]
          pinned_history[current_index] = temp

          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Add to Pinned Prompts') {
        if (!pinned_history.includes(item_text)) {
          pinned_history.push(item_text)
          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Remove from Pinned Prompts') {
        const index = pinned_history.indexOf(item_text)
        if (index != -1) {
          pinned_history.splice(index, 1)
          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Remove from Recent Prompts') {
        const index = history.indexOf(item_text)
        if (index != -1) {
          history.splice(index, 1)
          await provider.context.workspaceState.update(history_key, history)
        }
      }

      if (
        history.length == 0 &&
        pinned_history.length == 0 &&
        prompt_templates.length == 0
      ) {
        quick_pick.hide()
        return
      }

      const updated_items: vscode.QuickPickItem[] = []

      updated_items.push({
        label: `$(symbol-namespace) My prompt templates`,
        alwaysShow: true
      })

      if (pinned_history.length > 0) {
        updated_items.push({
          label: 'pinned',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...pinned_history.map((item, index) =>
            to_quick_pick_item(
              item,
              'pinned',
              true,
              index,
              pinned_history.length,
              !!current_search_value
            )
          )
        )
      }

      if (history.length > 0) {
        updated_items.push({
          label: 'recent',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...history.map((item) =>
            to_quick_pick_item(
              item,
              'recents',
              pinned_history.includes(item),
              undefined
            )
          )
        )
      }

      quick_pick.items = updated_items
      handle_get_history(provider)
    }),
    quick_pick.onDidChangeValue(() => {
      if (quick_pick.value == current_search_value) return
      current_search_value = quick_pick.value
      const is_searching = current_search_value.length > 0

      const updated_items: vscode.QuickPickItem[] = []

      updated_items.push({
        label: `$(symbol-namespace) My prompt templates`,
        alwaysShow: true
      })

      if (pinned_history.length > 0) {
        updated_items.push({
          label: 'pinned',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...pinned_history.map((item, index) =>
            to_quick_pick_item(
              item,
              'pinned',
              true,
              index,
              pinned_history.length,
              is_searching
            )
          )
        )
      }

      if (history.length > 0) {
        updated_items.push({
          label: 'recent',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...history.map((item) =>
            to_quick_pick_item(item, 'recents', pinned_history.includes(item))
          )
        )
      }
      quick_pick.items = updated_items
    }),
    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
    })
  )

  quick_pick.show()
}

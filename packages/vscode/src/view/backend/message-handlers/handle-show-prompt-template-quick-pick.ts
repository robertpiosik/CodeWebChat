import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'
import { InstructionsMessage } from '@/view/types/messages'
import { ApiMode, WebMode } from '@shared/types/modes'

type PromptTemplate = {
  name?: string
  template: string
}

export const handle_show_prompt_template_quick_pick = async (
  provider: ViewProvider
): Promise<void> => {
  const mode: WebMode | ApiMode | undefined =
    provider.home_view_type == HOME_VIEW_TYPES.WEB
      ? provider.web_mode
      : provider.api_mode

  if (!mode) {
    return
  }

  let prompt_templates_key: string | undefined
  switch (mode) {
    case 'ask':
      prompt_templates_key = 'promptTemplatesForAskAboutContext'
      break
    case 'edit':
      prompt_templates_key = 'promptTemplatesForEditContext'
      break
    case 'code-completions':
      prompt_templates_key = 'promptTemplatesForCodeAtCursor'
      break
    case 'no-context':
      prompt_templates_key = 'promptTemplatesForNoContext'
      break
  }

  if (!prompt_templates_key) return

  const config = vscode.workspace.getConfiguration('codeWebChat')
  let prompt_templates =
    config.get<PromptTemplate[]>(prompt_templates_key, []) || []

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

  let is_editing_template = false

  const templates_quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { template?: PromptTemplate; index?: number }
  >()
  templates_quick_pick.placeholder = 'Manage and use your prompt templates'

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
            if (index < templates.length - 1) buttons.push(move_down_button)
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

  const disposables: vscode.Disposable[] = []
  disposables.push(
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
          templates_quick_pick.items = create_template_items(prompt_templates)
        }
      } else if (
        'template' in selected_template &&
        selected_template.template
      ) {
        templates_quick_pick.hide()
        let prompt_text = selected_template.template.template
        const variable_regex = /\{([^{}]+)\}/g
        const matches = [...prompt_text.matchAll(variable_regex)]
        const variables = [...new Set(matches.map((match) => match[1].trim()))]

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
            templates_quick_pick.items = create_template_items(prompt_templates)
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
        templates_quick_pick.items = create_template_items(prompt_templates)
      } else if (event.button === move_up_button) {
        if (item.index > 0) {
          const temp = prompt_templates[item.index - 1]
          prompt_templates[item.index - 1] = prompt_templates[item.index]
          prompt_templates[item.index] = temp
          await config.update(
            prompt_templates_key,
            prompt_templates,
            vscode.ConfigurationTarget.Global
          )
          templates_quick_pick.items = create_template_items(prompt_templates)
        }
      } else if (event.button === move_down_button) {
        if (item.index < prompt_templates.length - 1) {
          const temp = prompt_templates[item.index + 1]
          prompt_templates[item.index + 1] = prompt_templates[item.index]
          prompt_templates[item.index] = temp
          await config.update(
            prompt_templates_key,
            prompt_templates,
            vscode.ConfigurationTarget.Global
          )
          templates_quick_pick.items = create_template_items(prompt_templates)
        }
      }
    }),
    templates_quick_pick.onDidHide(() => {
      if (is_editing_template) {
        // We are editing a template, which involves showing input boxes that hide the quick pick.
        // We don't want to dispose of everything in this case.
        return
      }
      disposables.forEach((d) => d.dispose())
    })
  )

  templates_quick_pick.show()
}

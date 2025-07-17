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
            label: template.name || 'Unnamed',
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

  const edit_template = async (
    template: PromptTemplate,
    index: number
  ): Promise<void> => {
    const BACK_LABEL = '$(arrow-left) Back'
    const NAME_LABEL = 'Name'
    const TEMPLATE_LABEL = 'Template'

    const create_edit_options = () => {
      return [
        { label: BACK_LABEL },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
          label: NAME_LABEL,
          description: template.name || 'Not set'
        },
        {
          label: TEMPLATE_LABEL,
          description:
            template.template.length > 50
              ? template.template.substring(0, 50) + '...'
              : template.template
        }
      ]
    }

    const edit_quick_pick = vscode.window.createQuickPick()
    edit_quick_pick.items = create_edit_options()
    edit_quick_pick.title = 'Edit Template'
    edit_quick_pick.placeholder = 'Select what to edit'

    return new Promise<void>((resolve) => {
      let is_accepted = false
      const edit_disposables: vscode.Disposable[] = []

      edit_disposables.push(
        edit_quick_pick.onDidAccept(async () => {
          is_accepted = true
          const selected = edit_quick_pick.selectedItems[0]
          if (!selected || selected.label === BACK_LABEL) {
            edit_quick_pick.hide()
            resolve()
            return
          }

          edit_quick_pick.hide()

          if (selected.label === NAME_LABEL) {
            const new_name = await vscode.window.showInputBox({
              prompt: 'Enter an optional name for the template.',
              value: template.name,
              placeHolder: 'Leave empty to remove name'
            })

            let next_template_state = template
            if (new_name !== undefined) {
              const updated_template: PromptTemplate = { ...template }
              if (new_name.trim()) {
                updated_template.name = new_name.trim()
              } else {
                delete updated_template.name
              }

              prompt_templates[index] = updated_template
              await config.update(
                prompt_templates_key,
                prompt_templates,
                vscode.ConfigurationTarget.Global
              )
              next_template_state = updated_template
            }
            await edit_template(next_template_state, index)
            resolve()
          } else if (selected.label === TEMPLATE_LABEL) {
            const new_template_text = await vscode.window.showInputBox({
              prompt: 'Enter the prompt template.',
              value: template.template,
              placeHolder:
                'E.g., Rewrite {function name} without redundant comments.'
            })
            let next_template_state = template
            if (new_template_text !== undefined && new_template_text.trim()) {
              const updated_template: PromptTemplate = {
                ...template,
                template: new_template_text.trim()
              }
              prompt_templates[index] = updated_template
              await config.update(
                prompt_templates_key,
                prompt_templates,
                vscode.ConfigurationTarget.Global
              )
              next_template_state = updated_template
            }
            await edit_template(next_template_state, index)
            resolve()
          }
        }),
        edit_quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve()
          }
          edit_disposables.forEach((d) => d.dispose())
        })
      )

      edit_quick_pick.show()
    })
  }

  templates_quick_pick.items = create_template_items(prompt_templates)

  const disposables: vscode.Disposable[] = []
  let is_disposed = false
  let is_showing_dialog = false

  disposables.push(
    templates_quick_pick.onDidAccept(async () => {
      const [selected_template] = templates_quick_pick.selectedItems
      if (!selected_template) {
        return
      }

      if (selected_template.label == '$(add) Add new template') {
        is_editing_template = true
        const name = await vscode.window.showInputBox({
          prompt: 'Enter an optional name for the template.'
        })
        if (name !== undefined) {
          const templateText = await vscode.window.showInputBox({
            prompt: 'Enter the prompt template.',
            placeHolder:
              'E.g., Rewrite {function name} without redundant comments.'
          })
          if (templateText !== undefined && templateText.trim()) {
            const newTemplate: PromptTemplate = {
              template: templateText.trim()
            }
            if (name.trim()) {
              newTemplate.name = name.trim()
            }

            prompt_templates = [...prompt_templates, newTemplate]

            await config.update(
              prompt_templates_key,
              prompt_templates,
              vscode.ConfigurationTarget.Global
            )
          }
        }
        templates_quick_pick.items = create_template_items(prompt_templates)
        is_editing_template = false
        if (!is_disposed) {
          templates_quick_pick.show()
        }
      } else if (
        'template' in selected_template &&
        selected_template.template
      ) {
        templates_quick_pick.hide()
        is_disposed = true
        let prompt_text = selected_template.template.template
        const variable_regex = /\{([^{}]+)\}/g
        const matches = [...prompt_text.matchAll(variable_regex)]
        const variables = [...new Set(matches.map((match) => match[1].trim()))]

        if (variables.length > 0) {
          for (const variable of variables) {
            const value = await vscode.window.showInputBox({
              prompt: `Enter a value for the variable.`,
              placeHolder: variable
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
        await edit_template(item.template, item.index)
        templates_quick_pick.items = create_template_items(prompt_templates)
        if (!is_disposed) {
          templates_quick_pick.show()
        }
        is_editing_template = false
      } else if (event.button === delete_button) {
        const template_to_delete = item.template
        const template_name = template_to_delete.name || 'Unnamed'
        const is_unnamed = !template_to_delete.name
        const delete_button_text = 'Delete'

        // Set flag before hiding to prevent disposal
        is_showing_dialog = true
        templates_quick_pick.hide()

        const delete_message = is_unnamed
          ? `Are you sure you want to delete this template?`
          : `Are you sure you want to delete the template "${template_name}"?`

        const result = await vscode.window.showWarningMessage(
          delete_message,
          { modal: true },
          delete_button_text
        )

        is_showing_dialog = false // Reset flag after dialog closes

        if (result !== delete_button_text) {
          // User cancelled, show the quick pick again
          if (!is_disposed) {
            templates_quick_pick.show()
          }
          return
        }

        const deleted_template = prompt_templates[item.index]
        const original_index = item.index

        const updated_templates = prompt_templates.filter(
          (_, index) => index !== item.index
        )

        await config.update(
          prompt_templates_key,
          updated_templates,
          vscode.ConfigurationTarget.Global
        )
        prompt_templates = updated_templates
        templates_quick_pick.items = create_template_items(prompt_templates)

        // Show the quick pick immediately after deletion
        if (!is_disposed) {
          templates_quick_pick.show()
        }

        // Handle undo asynchronously without blocking the UI
        const undo_button_text = 'Undo'
        const deletion_message = is_unnamed
          ? `Unnamed template has been deleted.`
          : `Template "${template_name}" has been deleted.`

        vscode.window
          .showInformationMessage(deletion_message, undo_button_text)
          .then(async (undo_result) => {
            if (undo_result === undo_button_text && deleted_template) {
              if (!is_disposed) {
                templates_quick_pick.hide()
              }

              prompt_templates.splice(original_index, 0, deleted_template)
              await config.update(
                prompt_templates_key,
                prompt_templates,
                vscode.ConfigurationTarget.Global
              )
              templates_quick_pick.items =
                create_template_items(prompt_templates)

              const restoration_message = is_unnamed
                ? `Unnamed template has been restored.`
                : `Template "${template_name}" has been restored.`

              vscode.window.showInformationMessage(restoration_message)

              // Show the quick pick again after undo
              if (!is_disposed) {
                templates_quick_pick.show()
              }
            }
          })
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
      if (is_editing_template || is_showing_dialog) {
        // We are editing a template, which involves showing input boxes that hide the quick pick.
        // Or we are showing a dialog (warning/info message) which also hides the quick pick.
        // We don't want to dispose of everything in these cases.
        return
      }

      is_disposed = true
      disposables.forEach((d) => d.dispose())
    })
  )

  templates_quick_pick.show()
}

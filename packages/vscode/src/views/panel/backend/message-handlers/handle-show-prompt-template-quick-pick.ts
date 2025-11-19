import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { MAIN_VIEW_TYPES } from '@/views/panel/types/home-view-type'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

type PromptTemplate = {
  name?: string
  template: string
}

const ADD_NEW_TEMPLATE_LABEL = '$(add) New prompt template...'

export const handle_show_prompt_template_quick_pick = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const mode: WebPromptType | ApiPromptType | undefined =
    panel_provider.main_view_type == MAIN_VIEW_TYPES.WEB
      ? panel_provider.web_prompt_type
      : panel_provider.api_prompt_type

  if (!mode) {
    return
  }

  let prompt_templates_key: string | undefined
  switch (mode) {
    case 'ask':
      prompt_templates_key = 'promptTemplatesForAskAboutContext'
      break
    case 'edit-context':
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
    switch (mode) {
      case 'ask':
        panel_provider.ask_instructions = text
        break
      case 'edit-context':
        panel_provider.edit_instructions = text
        break
      case 'no-context':
        panel_provider.no_context_instructions = text
        break
      case 'code-completions':
        panel_provider.code_completion_instructions = text
        break
      default:
        return
    }

    panel_provider.send_message({
      command: 'INSTRUCTIONS',
      ask: panel_provider.ask_instructions,
      edit_context: panel_provider.edit_instructions,
      no_context: panel_provider.no_context_instructions,
      code_completions: panel_provider.code_completion_instructions
    })
  }

  let is_editing_template = false

  const templates_quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { template?: PromptTemplate; index?: number }
  >()
  templates_quick_pick.matchOnDetail = true
  templates_quick_pick.placeholder = 'Manage and use your prompt templates'

  const edit_button = {
    iconPath: new vscode.ThemeIcon('edit'),
    tooltip: 'Edit template'
  }
  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: 'Delete template'
  }

  const create_template_items = (templates: PromptTemplate[]) => {
    const items: (vscode.QuickPickItem & {
      template?: PromptTemplate
      index?: number
    })[] = [
      {
        label: ADD_NEW_TEMPLATE_LABEL
      }
    ]
    if (templates.length > 0) {
      items.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      })
      items.push(
        ...templates.map((template, index) => {
          const buttons = [edit_button, delete_button]

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
  ): Promise<boolean> => {
    const NAME_LABEL = 'Name'
    const TEMPLATE_LABEL = 'Template'

    const create_edit_options = () => {
      return [
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
    edit_quick_pick.buttons = [vscode.QuickInputButtons.Back]

    return new Promise<boolean>((resolve) => {
      let is_accepted = false
      let did_trigger_back = false
      const edit_disposables: vscode.Disposable[] = []

      edit_disposables.push(
        edit_quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            edit_quick_pick.hide()
            resolve(false) // User clicked 'Back', do not cancel the main quick pick
          }
        }),
        edit_quick_pick.onDidAccept(async () => {
          is_accepted = true
          const selected = edit_quick_pick.selectedItems[0]
          if (!selected) {
            edit_quick_pick.hide()
            resolve(false) // User cancelled, do not cancel the main quick pick
            return
          }

          edit_quick_pick.hide()

          if (selected.label == NAME_LABEL) {
            const new_name = await vscode.window.showInputBox({
              prompt: 'Enter an optional name for the template',
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

            const should_cancel_entirely = await edit_template(
              next_template_state,
              index
            )
            resolve(should_cancel_entirely)
          } else if (selected.label == TEMPLATE_LABEL) {
            const new_template_text = await vscode.window.showInputBox({
              prompt: 'Enter the prompt template',
              value: template.template,
              placeHolder:
                'E.g., Rewrite {function name} without redundant comments'
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

            const should_cancel_entirely = await edit_template(
              next_template_state,
              index
            )
            resolve(should_cancel_entirely)
          }
        }),
        edit_quick_pick.onDidHide(() => {
          if (!is_accepted && !did_trigger_back) {
            resolve(false) // If quick pick is hidden without accepting (e.g. Escape), treat as 'Back'
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
  let notification_count = 0
  let is_template_accepted = false

  disposables.push(
    templates_quick_pick.onDidAccept(async () => {
      const [selected_template] = templates_quick_pick.selectedItems
      if (!selected_template) {
        return
      }

      if (selected_template.label == ADD_NEW_TEMPLATE_LABEL) {
        is_editing_template = true
        const template_text = await vscode.window.showInputBox({
          prompt: 'Enter the prompt template',
          placeHolder:
            'E.g., Rewrite {function name} without redundant comments'
        })
        if (template_text !== undefined && template_text.trim()) {
          const new_template: PromptTemplate = {
            template: template_text.trim()
          }
          prompt_templates = [...prompt_templates, new_template]

          await config.update(
            prompt_templates_key,
            prompt_templates,
            vscode.ConfigurationTarget.Global
          )
        }
        templates_quick_pick.items = create_template_items(prompt_templates)
        is_editing_template = false
        if (!is_disposed) {
          templates_quick_pick.show()
        }
      } else if (
        'template' in selected_template &&
        selected_template.template &&
        typeof selected_template.index == 'number'
      ) {
        is_template_accepted = true
        templates_quick_pick.hide()
        is_disposed = true

        // Move the selected template to the top of the list for easier access next time
        if (selected_template.index > 0) {
          const [movedTemplate] = prompt_templates.splice(
            selected_template.index,
            1
          )
          prompt_templates.unshift(movedTemplate)
          await config.update(
            prompt_templates_key,
            prompt_templates,
            vscode.ConfigurationTarget.Global
          )
        }

        let prompt_text = selected_template.template.template

        const single_brace_regex = /\{([^{}]+)\}/g
        const double_brace_regex = /\{\{([^{}]+)\}\}/g

        const single_matches = [...prompt_text.matchAll(single_brace_regex)]
        const double_matches = [...prompt_text.matchAll(double_brace_regex)]

        const variables = [
          ...new Set([
            ...single_matches.map((match) => match[1].trim()),
            ...double_matches.map((match) => match[1].trim())
          ])
        ]

        if (variables.length > 0) {
          for (const variable of variables) {
            const value = await vscode.window.showInputBox({
              prompt: `Enter a value for the variable "${variable}"`,
              placeHolder: variable
            })

            if (value) {
              const double_regex = new RegExp(
                `\\{\\{\\s*${variable.replace(
                  /[.*+?^${}()|[\\]\\\\]/g,
                  '\\$&'
                )}\\s*\\}\\}`,
                'g'
              )
              const single_regex = new RegExp(
                `\\{\\s*${variable.replace(
                  /[.*+?^${}()|[\\]\\\\]/g,
                  '\\$&'
                )}\\s*\\}`,
                'g'
              )
              prompt_text = prompt_text.replace(double_regex, value)
              prompt_text = prompt_text.replace(single_regex, value)
            }
          }
        }

        await set_instructions(prompt_text)
        panel_provider.send_message({
          command: 'FOCUS_PROMPT_FIELD'
        })
      }
    }),
    templates_quick_pick.onDidChangeValue(() => {
      templates_quick_pick.items = create_template_items(prompt_templates)
    }),
    templates_quick_pick.onDidTriggerItemButton(async (event) => {
      const item = event.item as vscode.QuickPickItem & {
        template: PromptTemplate
        index: number
      }

      if (event.button === edit_button) {
        is_editing_template = true
        const user_cancelled_entirely = await edit_template(
          item.template,
          item.index
        )

        if (user_cancelled_entirely) {
          // User cancelled editing completely (e.g., pressed Escape on the edit quick pick or an input box)
          templates_quick_pick.hide()
          is_disposed = true
        } else {
          // User clicked 'Back' from the edit quick pick, or successfully edited and returned to it.
          // We need to re-show the main templates_quick_pick.
          templates_quick_pick.items = create_template_items(prompt_templates)
          // Highlight the item that was just edited
          const edited_item = templates_quick_pick.items.find(
            (i) => i.index === item.index
          )
          if (edited_item) {
            templates_quick_pick.activeItems = [edited_item]
          }
          if (!is_disposed) {
            templates_quick_pick.show()
          }
        }
        is_editing_template = false
      } else if (event.button === delete_button) {
        const template_to_delete = item.template
        const template_name = template_to_delete.name || 'Unnamed'
        const is_unnamed = !template_to_delete.name
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

        // Handle undo asynchronously without blocking the UI
        const undo_button_text = 'Undo'
        notification_count++
        const deletion_message = is_unnamed
          ? `Unnamed template has been deleted.`
          : `Template "${template_name}" has been deleted.`

        vscode.window
          .showInformationMessage(deletion_message, undo_button_text)
          .then(async (undo_result) => {
            // Dialog is gone
            notification_count--
            if (undo_result === undo_button_text && deleted_template) {
              prompt_templates.splice(original_index, 0, deleted_template)
              await config.update(
                prompt_templates_key,
                prompt_templates,
                vscode.ConfigurationTarget.Global
              )
              templates_quick_pick.items =
                create_template_items(prompt_templates)

              notification_count++
              vscode.window
                .showInformationMessage('Template has been restored.')
                .then(() => {
                  notification_count--
                })

              if (!is_disposed) {
                templates_quick_pick.show()
              }
            } else {
              // User dismissed or didn't click undo, re-show the templates list
              if (!is_disposed) {
                templates_quick_pick.show()
              }
            }
          })
      }
    }),
    templates_quick_pick.onDidHide(() => {
      if (is_editing_template || notification_count > 0) {
        // We are editing a template, which involves showing input boxes that hide the quick pick.
        // Or we are showing a dialog (warning/info message) which also hides the quick pick.
        // We don't want to dispose of everything in these cases.
        return
      }

      is_disposed = true
      if (!is_template_accepted) {
        panel_provider.send_message({
          command: 'FOCUS_PROMPT_FIELD'
        })
      }
      disposables.forEach((d) => d.dispose())
    })
  )

  templates_quick_pick.show()
}

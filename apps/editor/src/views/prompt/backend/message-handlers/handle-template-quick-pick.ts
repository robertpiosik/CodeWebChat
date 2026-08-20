import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { MODE } from '@/views/prompt/types/main-view-mode'
import { get_last_used_template_key } from '@/constants/state-keys'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { t } from '@/i18n'

type Template = {
  name?: string
  template: string
}

export const handle_template_quick_pick = async (
  prompt_view_provider: PromptViewProvider
): Promise<void> => {
  const prompt_type: WebPromptType | ApiPromptType | undefined =
    prompt_view_provider.mode == MODE.WEB
      ? prompt_view_provider.web_prompt_type
      : prompt_view_provider.api_prompt_type

  if (!prompt_type) {
    return
  }

  let templates_key: string | undefined
  switch (prompt_type) {
    case 'ask-about-files':
      templates_key = 'templatesForAskAboutFiles'
      break
    case 'edit-files':
      templates_key = 'templatesForEditFiles'
      break
    case 'code-at-cursor':
      templates_key = 'templatesForCodeAtCursor'
      break
    case 'without-files':
      templates_key = 'templatesForWithoutFiles'
      break
  }

  if (!templates_key) return

  const config = vscode.workspace.getConfiguration('codeWebChat')
  const templates = config.get<Template[]>(templates_key, []) || []

  if (!templates.length) {
    prompt_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
    const selection = await vscode.window.showInformationMessage(
      t('views.prompt.handlers.handle-template-quick-pick.no-templates-found'),
      t('views.prompt.handlers.handle-template-quick-pick.open-settings')
    )
    if (
      selection ==
      t('views.prompt.handlers.handle-template-quick-pick.open-settings')
    ) {
      vscode.commands.executeCommand(
        'codeWebChat.settings',
        'section:general:group:prompt-field'
      )
    }
    return
  }

  const templates_quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { template?: Template; index?: number }
  >()
  templates_quick_pick.title = 'Templates'
  templates_quick_pick.placeholder = 'Select a template'
  templates_quick_pick.buttons = [
    { iconPath: new vscode.ThemeIcon('close'), tooltip: t('common.close') }
  ]

  const get_template_id = (t: Template) => t.name || t.template
  const recents_key = get_last_used_template_key(prompt_type)
  const last_used_id =
    prompt_view_provider.extension_context.workspaceState.get<string>(
      recents_key
    ) ??
    prompt_view_provider.extension_context.globalState.get<string>(recents_key)

  const create_template_items = (current_templates: Template[]) => {
    const items: (vscode.QuickPickItem & {
      template?: Template
      index?: number
    })[] = []

    if (current_templates.length > 0) {
      items.push(
        ...current_templates.map((template, index) => {
          return {
            label: template.name || 'Unnamed',
            template,
            index
          }
        })
      )
    }
    return items
  }

  templates_quick_pick.items = create_template_items(templates)

  let active_item = templates_quick_pick.items.find(
    (i) => i.template && get_template_id(i.template) === last_used_id
  )
  if (!active_item) {
    active_item = templates_quick_pick.items.find((i) => i.template)
  }
  if (active_item) {
    templates_quick_pick.activeItems = [active_item]
  }

  const disposables: vscode.Disposable[] = []
  let is_template_accepted = false
  let is_entering_variables = false

  disposables.push(
    templates_quick_pick.onDidTriggerButton((_button) => {
      templates_quick_pick.hide()
    }),
    templates_quick_pick.onDidAccept(async () => {
      const [selected_template] = templates_quick_pick.selectedItems
      if (!selected_template) {
        return
      }

      if (
        'template' in selected_template &&
        selected_template.template &&
        typeof selected_template.index == 'number'
      ) {
        prompt_view_provider.extension_context.workspaceState.update(
          recents_key,
          get_template_id(selected_template.template)
        )
        prompt_view_provider.extension_context.globalState.update(
          recents_key,
          get_template_id(selected_template.template)
        )

        is_entering_variables = true
        templates_quick_pick.hide()

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

        const variable_values: Record<string, string> = {}
        let cancelled = false
        let go_back_to_templates = false

        if (variables.length > 0) {
          let i = 0
          while (i < variables.length) {
            const variable = variables[i]

            const result = await new Promise<{
              value?: string
              back: boolean
              cancel: boolean
            }>((resolve) => {
              const input = vscode.window.createInputBox()
              input.title = 'Enter Variable'
              input.placeholder = variable
              input.value = variable_values[variable] || ''
              input.buttons = [vscode.QuickInputButtons.Back]

              let resolved = false
              const input_disposables: vscode.Disposable[] = []

              input_disposables.push(
                input.onDidTriggerButton((button) => {
                  if (button === vscode.QuickInputButtons.Back) {
                    resolved = true
                    input.hide()
                    resolve({ back: true, cancel: false })
                  }
                }),
                input.onDidAccept(() => {
                  resolved = true
                  const val = input.value
                  input.hide()
                  resolve({ value: val, back: false, cancel: false })
                }),
                input.onDidHide(() => {
                  if (!resolved) {
                    resolve({ cancel: true, back: false })
                  }
                  input_disposables.forEach((d) => d.dispose())
                  input.dispose()
                })
              )

              input.show()
            })

            if (result.cancel) {
              cancelled = true
              break
            }

            if (result.back) {
              if (i === 0) {
                go_back_to_templates = true
                break
              } else {
                i--
                continue
              }
            }

            if (result.value !== undefined) {
              variable_values[variable] = result.value
              i++
            }
          }

          if (cancelled) {
            is_entering_variables = false
            prompt_view_provider.send_message({
              command: 'FOCUS_PROMPT_FIELD'
            })
            disposables.forEach((d) => d.dispose())
            return
          }

          if (go_back_to_templates) {
            is_entering_variables = false
            templates_quick_pick.items = create_template_items(templates)

            const attempted_item = templates_quick_pick.items.find(
              (i) => i.template === selected_template.template
            )
            if (attempted_item) {
              templates_quick_pick.activeItems = [attempted_item]
            }

            templates_quick_pick.show()
            return
          }

          for (const variable of variables) {
            const value = variable_values[variable]
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

        is_entering_variables = false
        is_template_accepted = true

        const current_text = prompt_view_provider.current_instruction
        const is_after_slash = current_text
          .slice(0, prompt_view_provider.caret_position)
          .endsWith('/')
        if (is_after_slash) {
          prompt_view_provider.add_text_at_cursor_position(prompt_text, 1)
        } else {
          prompt_view_provider.add_text_at_cursor_position(prompt_text)
        }
        prompt_view_provider.send_message({
          command: 'FOCUS_PROMPT_FIELD'
        })
        disposables.forEach((d) => d.dispose())
      }
    }),
    templates_quick_pick.onDidChangeValue(() => {
      templates_quick_pick.items = create_template_items(templates)
    }),
    templates_quick_pick.onDidHide(() => {
      if (is_entering_variables) {
        return
      }

      if (!is_template_accepted) {
        prompt_view_provider.send_message({
          command: 'FOCUS_PROMPT_FIELD'
        })
      }
      disposables.forEach((d) => d.dispose())
    })
  )

  templates_quick_pick.show()
}

import { useState, useEffect, useCallback } from 'react'
import { Template, BackendMessage } from '../../types/messages'
import { post_message } from '../utils/post-message'

export const use_template_editing = (
  vscode: any,
  templates: Record<string, Template[]> | undefined,
  on_update_templates: (key: string, templates: Template[]) => void
) => {
  const [updating_template, set_updating_template] = useState<{
    key: string
    index?: number
    insertion_index?: number
    template: Template
  } | null>(null)
  const [updated_template, set_updated_template] = useState<Template | null>(
    null
  )

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command == 'START_TEMPLATE_CREATION') {
        set_updating_template({
          key: event.data.templates_key,
          insertion_index: event.data.insertion_index,
          template: event.data.template
        })
        set_updated_template(event.data.template)
      } else if (event.data.command == 'TEMPLATE_EDIT_CANCELLED') {
        set_updating_template(null)
        set_updated_template(null)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_template_cancel_handler = useCallback(() => {
    if (updating_template && updated_template) {
      const a = updating_template.template
      const b = updated_template
      const a_name = (a.name || '').trim()
      const b_name = (b.name || '').trim()
      const a_template = a.template.trim()
      const b_template = b.template.trim()
      const has_changes = a_name != b_name || a_template !== b_template

      if (has_changes) {
        post_message(vscode, { command: 'CANCEL_TEMPLATE_EDIT' })
        return
      }
    }
    set_updating_template(null)
    set_updated_template(null)
  }, [vscode, updating_template, updated_template])

  const edit_template_save_handler = useCallback(() => {
    if (updating_template && updated_template) {
      const { key, index, insertion_index } = updating_template
      const updated_templates = [...(templates?.[key] || [])]

      if (index !== undefined) {
        updated_templates[index] = updated_template
      } else if (insertion_index !== undefined) {
        updated_templates.splice(insertion_index, 0, updated_template)
      } else {
        updated_templates.push(updated_template)
      }

      on_update_templates(key, updated_templates)
    }
    set_updating_template(null)
    set_updated_template(null)
  }, [updating_template, updated_template, templates, on_update_templates])

  const start_editing_template = useCallback(
    (key: string, index: number) => {
      const template = templates?.[key]?.[index]
      if (template) {
        set_updating_template({ key, index, template })
        set_updated_template(template)
      }
    },
    [templates]
  )

  return {
    updating_template,
    set_updated_template,
    edit_template_cancel_handler,
    edit_template_save_handler,
    start_editing_template
  }
}

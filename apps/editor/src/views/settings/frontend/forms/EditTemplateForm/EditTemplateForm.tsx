import { useState, useEffect, useRef } from 'react'
import styles from './EditTemplateForm.module.scss'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import {
  Template as UiTemplate,
  TemplateHandle
} from '@ui/components/editor/common/prompts/Template'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/prompt-view/Fieldset'
import { use_translation } from '../../i18n/use-translation'
import { Template, BackendMessage } from '@/views/settings/types/messages'
import { post_message } from '../../utils/post-message'

type Props = {
  template: Template
  on_update: (draft: Template) => void
  vscode: any
}

export const EditTemplateForm: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [name, set_name] = useState(props.template.name || '')
  const [template, set_template] = useState(props.template.template)
  const template_ref = useRef<TemplateHandle>(null)
  const [first_insert, set_first_insert] = useState(true)

  useEffect(() => {
    props.on_update({
      name: name.trim() || undefined,
      template
    })
  }, [name, template, props.on_update])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command === 'INSERT_SYMBOL') {
        const text = event.data.text
        if (template_ref.current) {
          const caret_pos = template_ref.current.get_caret_position()
          let new_caret_pos = caret_pos

          set_template((prev) => {
            let before = prev.slice(0, caret_pos)
            const after = prev.slice(caret_pos)

            if (first_insert && before.endsWith('#')) {
              before = before.slice(0, -1)
            }

            new_caret_pos = before.length + text.length
            set_first_insert(false)

            return before + text + after
          })

          setTimeout(() => {
            template_ref.current?.focus()
            template_ref.current?.set_caret_position(new_caret_pos)
          }, 10)
        }
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [first_insert])

  return (
    <UiScrollable top_shadow>
      <div className={styles.form}>
        <UiFieldset>
          <UiField label={t('common.name')} html_for="name">
            <UiInput
              id="name"
              type="text"
              value={name}
              on_change={set_name}
              placeholder={t('edit-template-form.name.placeholder')}
            />
          </UiField>

          <UiField
            label={t('edit-template-form.template.label')}
            html_for="template"
          >
            <UiTemplate
              id="template"
              ref={template_ref}
              value={template}
              placeholder={t('edit-template-form.template.placeholder')}
              on_change={set_template}
              on_focus={() => {}}
              on_insert_symbol_click={() => {
                set_first_insert(true)
                post_message(props.vscode, {
                  command: 'SHOW_HASH_SIGN_QUICK_PICK'
                })
              }}
            />
          </UiField>
        </UiFieldset>
      </div>
    </UiScrollable>
  )
}

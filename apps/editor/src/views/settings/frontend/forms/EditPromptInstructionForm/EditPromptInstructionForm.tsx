import { useState, useEffect, useRef } from 'react'
import styles from './EditPromptInstructionForm.module.scss'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import {
  Template as UiTemplate,
  TemplateHandle
} from '@ui/components/editor/common/prompts/Template'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/prompt-view/Fieldset'
import { use_translation } from '../../i18n/use-translation'
import {
  PromptInstruction,
  BackendMessage
} from '@/views/settings/types/messages'
import { post_message } from '../../utils/post-message'

type Props = {
  instruction: PromptInstruction
  on_update: (draft: PromptInstruction) => void
  vscode: any
  type: 'template' | 'snippet'
}

export const EditPromptInstructionForm: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [name, set_name] = useState(props.instruction.name || '')
  const [value, set_value] = useState(props.instruction.value || '')
  const template_ref = useRef<TemplateHandle>(null)
  const [first_insert, set_first_insert] = useState(true)

  useEffect(() => {
    props.on_update({
      name: name.trim() || undefined,
      value
    })
  }, [name, value, props.on_update])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command === 'INSERT_SYMBOL') {
        const text = event.data.text
        if (template_ref.current) {
          const caret_pos = template_ref.current.get_caret_position()
          let new_caret_pos = caret_pos

          set_value((prev) => {
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
              placeholder={
                props.type === 'template'
                  ? t('edit-template-form.name.placeholder')
                  : 'E.g., Rule 1'
              }
            />
          </UiField>

          <UiField
            label={
              props.type === 'template'
                ? t('edit-template-form.template.label')
                : 'Instruction'
            }
            html_for="value"
          >
            <UiTemplate
              id="value"
              ref={template_ref}
              value={value}
              placeholder={
                props.type === 'template'
                  ? t('edit-template-form.template.placeholder')
                  : 'E.g., Do not use relative imports.'
              }
              on_change={set_value}
              on_focus={() => {}}
              on_insert_symbol_click={() => {
                set_first_insert(true)
                post_message(props.vscode, {
                  command: 'SHOW_HASH_SIGN_QUICK_PICK',
                  include:
                    props.type == 'template' ? ['skill', 'snippets'] : ['skill']
                })
              }}
              highlight_template_variables={props.type === 'template'}
            />
          </UiField>
        </UiFieldset>
      </div>
    </UiScrollable>
  )
}

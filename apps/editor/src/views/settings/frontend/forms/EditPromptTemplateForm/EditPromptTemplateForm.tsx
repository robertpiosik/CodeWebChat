import { useState, useEffect } from 'react'
import styles from './EditPromptTemplateForm.module.scss'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/prompt/Fieldset'
import { use_translation } from '../../i18n/use-translation'
import { PromptTemplate } from '@/views/settings/types/messages'

type Props = {
  template: PromptTemplate
  on_update: (draft: PromptTemplate) => void
}

export const EditPromptTemplateForm: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [name, set_name] = useState(props.template.name || '')
  const [template, set_template] = useState(props.template.template)

  useEffect(() => {
    props.on_update({
      name: name.trim() || undefined,
      template: template.trim()
    })
  }, [name, template, props.on_update])

  return (
    <UiScrollable top_shadow>
      <div className={styles.form}>
        <UiFieldset>
          <UiField
            label={t('edit-prompt-template-form.name.label')}
            html_for="name"
          >
            <UiInput
              id="name"
              type="text"
              value={name}
              on_change={set_name}
              placeholder={t('edit-prompt-template-form.name.placeholder')}
            />
          </UiField>

          <UiField
            label={t('edit-prompt-template-form.template.label')}
            html_for="template"
          >
            <UiTextarea
              id="template"
              value={template}
              min_rows={3}
              on_change={set_template}
              placeholder={t('edit-prompt-template-form.template.placeholder')}
            />
          </UiField>
        </UiFieldset>
      </div>
    </UiScrollable>
  )
}

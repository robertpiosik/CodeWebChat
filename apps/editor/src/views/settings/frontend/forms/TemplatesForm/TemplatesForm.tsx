import React from 'react'
import { Templates as UiTemplates } from '@ui/components/editor/settings-view/Templates'
import { Template } from '@/views/settings/types/messages'
import { use_translation } from '../../i18n/use-translation'

type Props = {
  templates: Record<string, Template[]>
  on_reorder: (key: string, templates: Template[]) => void
  on_delete: (key: string, index: number) => void
  on_edit: (key: string, index: number) => void
  on_add: (
    key: string,
    params?: { insertion_index?: number; exact_insertion?: boolean }
  ) => void
}

export const TemplatesForm: React.FC<Props> = (props) => {
  const { t } = use_translation()

  return (
    <UiTemplates
      templates={[
        {
          key: 'templatesForEditFiles',
          label: 'Edit',
          icon: 'edit-sparkle',
          accent_color: 'blue',
          items: props.templates.templatesForEditFiles || []
        },
        {
          key: 'templatesForAskAboutFiles',
          label: 'Ask',
          icon: 'chat-sparkle',
          accent_color: 'purple',
          items: props.templates.templatesForAskAboutFiles || []
        }
      ]}
      on_reorder={props.on_reorder}
      on_delete={props.on_delete}
      on_edit={props.on_edit}
      on_add={props.on_add}
      translations={{
        item_text: t('general.prompt.templates.item'),
        items_text: t('general.prompt.templates.items'),
        items_text_many: t('general.prompt.templates.items-many'),
        expand: t('common.expand'),
        collapse: t('common.collapse'),
        add_new: t('action.add-new')
      }}
    />
  )
}

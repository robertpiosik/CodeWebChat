import React from 'react'
import { PromptInstructions as UiPromptInstructions } from '@ui/components/editor/settings-view/PromptInstructions'
import {
  PromptInstruction,
  PromptInstructionKey
} from '@/views/settings/types/messages'
import { use_translation } from '../../i18n/use-translation'

type Props = {
  prompt_instructions: Partial<
    Record<PromptInstructionKey, PromptInstruction[]>
  >
  on_reorder: (key: PromptInstructionKey, items: PromptInstruction[]) => void
  on_delete: (key: PromptInstructionKey, index: number) => void
  on_edit: (key: PromptInstructionKey, index: number) => void
  on_add: (
    key: PromptInstructionKey,
    params?: { insertion_index?: number; exact_insertion?: boolean }
  ) => void
}

export const TemplatesForm: React.FC<Props> = (props) => {
  const { t } = use_translation()

  return (
    <UiPromptInstructions
      items={[
        {
          key: 'templatesForEditFiles',
          label: 'Edit',
          icon: 'edit-sparkle',
          accent_color: 'blue',
          items: props.prompt_instructions.templatesForEditFiles || []
        },
        {
          key: 'templatesForAskAboutFiles',
          label: 'Ask',
          icon: 'chat-sparkle',
          accent_color: 'purple',
          items: props.prompt_instructions.templatesForAskAboutFiles || []
        }
      ]}
      on_reorder={(key, items) =>
        props.on_reorder(key as PromptInstructionKey, items)
      }
      on_delete={(key, index) =>
        props.on_delete(key as PromptInstructionKey, index)
      }
      on_edit={(key, index) =>
        props.on_edit(key as PromptInstructionKey, index)
      }
      on_add={(key, params) =>
        props.on_add(key as PromptInstructionKey, params)
      }
      translations={{
        item_text: t('general.prompt.templates.item'),
        items_text: t('general.prompt.templates.items'),
        items_text_many: t('general.prompt.templates.items-many'),
        expand: t('common.expand'),
        collapse: t('common.collapse'),
        add_new: t('actions.add-new')
      }}
    />
  )
}

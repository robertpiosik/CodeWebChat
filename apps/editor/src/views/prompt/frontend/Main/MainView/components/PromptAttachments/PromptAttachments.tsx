import React from 'react'
import { StatusBar } from '@ui/components/editor/prompt-view/StatusBar'
import { display_token_count } from '@shared/utils/display-token-count'

type Props = {
  token_count?: number
  files_count?: number
  theme: 'blue' | 'purple'
  translations: {
    attaching_file: string
    attaching_files: string
    agentic_search: string
    clear_context: string
    find_context_files: string
  }
  is_alt_pressed?: boolean
  on_agentic_search: () => void
  on_clear_context: () => void
}

export const PromptAttachments: React.FC<Props> = (props) => {
  const attaching_files_label = (
    props.files_count == 1
      ? props.translations.attaching_file
      : props.translations.attaching_files
  ).replace('{count}', String(props.files_count || 0))

  return (
    <StatusBar
      placement="bottom"
      theme={props.theme}
      icon="codicon-attach"
      label={attaching_files_label}
      description={
        (props.token_count ?? 0) > 0
          ? display_token_count(props.token_count ?? 0)
          : undefined
      }
      actions={[
        {
          id: 'agentic-search',
          icon: 'codicon-search-sparkle',
          label: props.translations.agentic_search,
          tooltip: props.translations.find_context_files,
          keycap: props.is_alt_pressed ? 'F' : undefined,
          on_click: props.on_agentic_search
        },
        {
          id: 'clear-context',
          icon: 'codicon-clear-all',
          tooltip: props.translations.clear_context,
          tooltip_align: 'right',
          keycap: props.is_alt_pressed ? 'X' : undefined,
          on_click: props.on_clear_context
        }
      ]}
    />
  )
}

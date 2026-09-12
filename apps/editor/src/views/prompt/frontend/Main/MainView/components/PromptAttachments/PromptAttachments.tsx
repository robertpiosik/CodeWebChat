import React from 'react'
import { StatusBar } from '@ui/components/editor/prompt/StatusBar'
import { display_token_count } from '@shared/utils/display-token-count'

type Props = {
  token_count?: number
  files_count?: number
  theme?: 'default' | 'warning' | 'success' | 'error' | 'blue' | 'purple'
  translations: {
    attaching_file: string
    attaching_files: string
    agentic_search: string
  }
  on_agentic_search: () => void
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
      theme={props.theme ?? 'default'}
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
          on_click: props.on_agentic_search
        }
      ]}
    />
  )
}

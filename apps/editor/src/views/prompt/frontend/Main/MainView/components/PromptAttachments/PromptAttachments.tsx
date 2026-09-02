import React from 'react'
import { StatusBar } from '@ui/components/editor/prompt/StatusBar'
import { display_token_count } from '@shared/utils/display-token-count'

type Props = {
  token_count?: number
  files_count?: number
  translations: {
    warning?: string
    attaching_file: string
    attaching_files: string
  }
}

export const PromptAttachments: React.FC<Props> = (props) => {
  if (!props.translations.warning && props.files_count === undefined) {
    return null
  }

  const attaching_files_label = (
    props.files_count == 1
      ? props.translations.attaching_file
      : props.translations.attaching_files
  ).replace('{count}', String(props.files_count))

  return (
    <>
      {props.translations.warning && (
        <StatusBar
          placement="bottom"
          theme="warning"
          icon="codicon-warning"
          label={props.translations.warning}
        />
      )}
      {props.files_count !== undefined && (
        <StatusBar
          placement="bottom"
          theme="default"
          icon="codicon-attach"
          label={attaching_files_label}
          description={
            (props.token_count ?? 0) > 0
              ? display_token_count(props.token_count ?? 0)
              : undefined
          }
        />
      )}
    </>
  )
}

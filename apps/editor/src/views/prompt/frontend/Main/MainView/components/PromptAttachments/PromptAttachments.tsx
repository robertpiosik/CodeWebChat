import React from 'react'
import { StatusBar } from '@ui/components/editor/prompt/StatusBar'
import { display_token_count } from '@shared/utils/display-token-count'

type Props = {
  token_count?: number
  files_count?: number
  translations: {
    warning?: string
    attaching_files: string
  }
}

export const PromptAttachments: React.FC<Props> = (props) => {
  if (!props.translations.warning && props.files_count === undefined) {
    return null
  }

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
          label={props.translations.attaching_files.replace(
            '{files}',
            String(props.files_count)
          )}
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

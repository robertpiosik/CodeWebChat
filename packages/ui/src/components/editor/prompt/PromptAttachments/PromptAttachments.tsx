import React from 'react'
import styles from './PromptAttachments.module.scss'
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
        <div className={`${styles.notice} ${styles.warning}`}>
          <span className={styles.icon}>
            <span className="codicon codicon-warning" />
          </span>
          <label className={styles.label}>
            <span>{props.translations.warning}</span>
          </label>
        </div>
      )}
      {props.files_count !== undefined && (
        <div className={`${styles.notice} ${styles.files}`}>
          <span className={styles.icon}>
            <span className="codicon codicon-attach" />
          </span>
          <label className={styles.label}>
            <span>
              {props.translations.attaching_files.replace(
                '{files}',
                String(props.files_count)
              )}
            </span>
            {(props.token_count ?? 0) > 0 && (
              <span className={styles.tokens}>
                {display_token_count(props.token_count ?? 0)}
              </span>
            )}
          </label>
        </div>
      )}
    </>
  )
}

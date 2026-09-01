import React, { useEffect, useState } from 'react'
import styles from './PromptNotice.module.scss'
import { display_token_count } from '@shared/utils/display-token-count'

type Props = {
  warning?: string
  token_count?: number
  files_count?: number
  translations?: {
    attaching_files: string
  }
}

export const PromptNotice: React.FC<Props> = (props) => {
  const [displayed_state, set_displayed_state] = useState({
    token_count: props.token_count ?? 0,
    files_count: props.files_count ?? 0
  })

  useEffect(() => {
    const timeout = setTimeout(() => {
      set_displayed_state((prev) => ({
        token_count: props.token_count ?? prev.token_count,
        files_count: props.files_count ?? prev.files_count
      }))
    }, 50)

    return () => clearTimeout(timeout)
  }, [props.token_count, props.files_count])

  if (!props.warning && props.files_count === undefined) {
    return null
  }

  return (
    <div className={styles.container}>
      {props.warning && (
        <div className={`${styles.notice} ${styles.warning}`}>
          <span className={styles.icon}>
            <span className="codicon codicon-warning" />
          </span>
          <label className={styles.label}>
            <span>{props.warning}</span>
          </label>
        </div>
      )}
      {props.files_count !== undefined && props.translations && (
        <div className={`${styles.notice} ${styles.files}`}>
          <span className={styles.icon}>
            <span className="codicon codicon-attach" />
          </span>
          <label className={styles.label}>
            <span>
              {props.translations.attaching_files.replace(
                '{files}',
                String(displayed_state.files_count)
              )}
            </span>
            {displayed_state.token_count > 0 && (
              <span className={styles.tokens}>
                {display_token_count(displayed_state.token_count)}
              </span>
            )}
          </label>
        </div>
      )}
    </div>
  )
}

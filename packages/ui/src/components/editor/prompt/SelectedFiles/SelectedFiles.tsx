import React, { useEffect, useState } from 'react'
import styles from './SelectedFiles.module.scss'
import { display_token_count } from '@shared/utils/display-token-count'

type Props = {
  token_count: number
  files_count: number
  translations: {
    attaching_files: string
  }
}

export const SelectedFiles: React.FC<Props> = (props) => {
  const [displayed_state, set_displayed_state] = useState({
    token_count: props.token_count,
    files_count: props.files_count
  })

  useEffect(() => {
    const timeout = setTimeout(() => {
      set_displayed_state({
        token_count: props.token_count,
        files_count: props.files_count
      })
    }, 50)

    return () => clearTimeout(timeout)
  }, [props.token_count, props.files_count])

  return (
    <div className={styles.container}>
      <span className={styles.attach}>
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
  )
}

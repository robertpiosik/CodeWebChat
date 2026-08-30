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
  const [files_ount, set_files_count] = useState(props.files_count)

  useEffect(() => {
    set_files_count(props.files_count)
  }, [props.token_count])

  return (
    <div className={styles.container}>
      <span className={styles.attach}>
        <span className="codicon codicon-attach" />
      </span>
      <label className={styles.label}>
        <span>
          {props.translations.attaching_files.replace(
            '{files}',
            String(files_ount)
          )}
        </span>
        {props.token_count > 0 && (
          <span className={styles.tokens}>
            {display_token_count(props.token_count)}
          </span>
        )}
      </label>
    </div>
  )
}

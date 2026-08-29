import React from 'react'
import styles from './SelectedFiles.module.scss'
import { display_token_count } from '@shared/utils/display-token-count'

export namespace SelectedFiles {
  export type Props = {
    selected_files_token_count: number
    selected_files_count: number
    translations: {
      attach_selected_files: string
      attaching_files: string
    }
  }
}

export const SelectedFiles: React.FC<SelectedFiles.Props> = (props) => {
  return (
    <div className={styles.container}>
      <span className={styles.attach}>
        <span className="codicon codicon-attach" />
      </span>
      <label className={styles.label}>
        <span>
          {props.translations.attaching_files.replace(
            '{files}',
            String(props.selected_files_count)
          )}
        </span>
        <span className={styles.tokens}>
          {display_token_count(props.selected_files_token_count)}
        </span>
      </label>
    </div>
  )
}

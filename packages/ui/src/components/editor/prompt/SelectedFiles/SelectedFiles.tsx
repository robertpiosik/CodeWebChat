import React from 'react'
import styles from './SelectedFiles.module.scss'
import cn from 'classnames'
import { Checkbox } from '../../common/Checkbox'
import { display_token_count } from '@shared/utils/display-token-count'

export namespace SelectedFiles {
  export type Props = {
    selected_files_token_count: number
    include_selected_files: boolean
    on_toggle_include_selected_files: (include: boolean) => void
    on_preview: () => void
    translations: {
      attach_selected_files: string
      preview: string
    }
  }
}

export const SelectedFiles: React.FC<SelectedFiles.Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <Checkbox
          checked={props.include_selected_files}
          on_change={props.on_toggle_include_selected_files}
          title={props.translations.attach_selected_files}
        />
        <label
          className={styles.left__label}
          onClick={() =>
            props.on_toggle_include_selected_files(
              !props.include_selected_files
            )
          }
        >
          {props.translations.attach_selected_files}
        </label>
      </div>
      <div className={styles.actions}>
        <span
          className={cn(styles.count, {
            [styles['count--excluded']]: props.include_selected_files === false
          })}
        >
          {display_token_count(props.selected_files_token_count)}
        </span>
        <div
          className={styles.preview}
          onClick={(e) => {
            e.stopPropagation()
            props.on_preview?.()
          }}
          title={props.translations.preview}
        >
          <span className="codicon codicon-open-preview" />
          <span>{props.translations.preview}</span>
        </div>
      </div>
    </div>
  )
}

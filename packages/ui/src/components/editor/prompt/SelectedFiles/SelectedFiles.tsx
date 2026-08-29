import React from 'react'
import styles from './SelectedFiles.module.scss'
import { Checkbox } from '../../common/Checkbox'
import { display_token_count } from '@shared/utils/display-token-count'

export namespace SelectedFiles {
  export type Props = {
    selected_files_token_count: number
    include_selected_files: boolean
    on_toggle_include_selected_files: (include: boolean) => void
    translations: {
      attach_selected_files: string
      tokens_in_selected_files: string
      disabled_attaching_files: string
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
          {!props.include_selected_files ? (
            <>
              <span className={styles.warning}>
                <span className="codicon codicon-warning" />
              </span>
              <span className={styles['wont-send']}>
                {props.translations.disabled_attaching_files}
              </span>
            </>
          ) : (
            <>
              {display_token_count(props.selected_files_token_count)}{' '}
              {props.translations.tokens_in_selected_files}
            </>
          )}
        </label>
      </div>
    </div>
  )
}

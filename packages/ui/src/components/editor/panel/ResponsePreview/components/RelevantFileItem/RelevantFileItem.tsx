import { FC } from 'react'
import cn from 'classnames'
import { RelevantFileInPreview } from '@shared/types/file-in-preview'
import styles from './RelevantFileItem.module.scss'
import { Checkbox } from '../../../../common/Checkbox'
import { IconButton } from '../../../../common/IconButton'

type Props = {
  file: RelevantFileInPreview
  is_selected: boolean
  has_multiple_workspaces: boolean
  total_files_count: number
  on_click: () => void
  on_toggle: (checked: boolean) => void
  on_go_to_file: () => void
}

export const RelevantFileItem: FC<Props> = (props) => {
  const last_slash_index = props.file.file_path.lastIndexOf('/')
  const file_name = props.file.file_path.substring(last_slash_index + 1)
  const dir_path =
    last_slash_index > -1
      ? props.file.file_path.substring(0, last_slash_index)
      : ''

  return (
    <div className={styles.container}>
      <div
        className={cn(styles.file, {
          [styles['file--selected']]: props.is_selected
        })}
        onClick={props.on_click}
        role="button"
        title={props.file.file_path}
      >
        <div className={styles['file__left']}>
          {props.total_files_count > 1 && (
            <Checkbox
              checked={props.file.is_checked}
              on_change={props.on_toggle}
            />
          )}
          <div className={styles['file__left__label']}>
            <span>{file_name}</span>

            <span>
              {props.has_multiple_workspaces && props.file.workspace_name
                ? `${props.file.workspace_name}${dir_path ? '/' : ''}`
                : ''}
              {dir_path}
            </span>
          </div>
        </div>
        <div className={styles['file__right']}>
          <div className={styles['file__actions']}>
            <IconButton
              codicon_icon="go-to-file"
              title="Go to file"
              on_click={(e) => {
                e.stopPropagation()
                props.on_go_to_file()
              }}
            />
          </div>
          {props.file.token_count !== undefined && (
            <div className={styles['file__tokens']}>
              {props.file.token_count >= 1000
                ? `${(props.file.token_count / 1000).toFixed(1)}k`
                : props.file.token_count}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import styles from './StageFilesModal.module.scss'
import { Button } from '../../../common/Button'
import { Modal } from '../Modal'
import { Checkbox } from '../../../common/Checkbox'
import { IconButton } from '../../IconButton/IconButton'
import cn from 'classnames'

const UNTRACKED_STATUS = 7
const DELETED_STATUS = 6
const MODIFIED_STATUS = 5

type Props = {
  files: { path: string; status: number }[]
  on_stage: (files_to_stage: string[]) => void
  on_cancel: () => void
  on_go_to_file: (file: string) => void
  on_show_diff: (file: string) => void
}

export const StageFilesModal: React.FC<Props> = (props) => {
  const [selected_files, set_selected_files] = useState<string[]>(
    props.files.map((f) => f.path)
  )

  const handle_toggle_file = (file: string, is_checked: boolean) => {
    if (is_checked) {
      set_selected_files((prev) => [...prev, file])
    } else {
      set_selected_files((prev) => prev.filter((f) => f !== file))
    }
  }

  const handle_toggle_select_all = (is_checked: boolean) => {
    if (is_checked) {
      set_selected_files(props.files.map((f) => f.path))
    } else {
      set_selected_files([])
    }
  }

  const all_selected =
    props.files.length > 0 && selected_files.length === props.files.length

  const handle_stage = () => {
    props.on_stage(selected_files)
  }

  return (
    <Modal
      title="Select files to commit"
      content_max_height="calc(100vh - 150px)"
      use_full_width={true}
      content_slot={
        <div className={styles.files}>
          <label
            className={cn(
              styles.files__item,
              styles['files__item--select-all']
            )}
          >
            <Checkbox
              checked={all_selected}
              on_change={handle_toggle_select_all}
            />
            <div className={styles.files__item__details}>Select all</div>
          </label>
          {props.files.map((file_item) => {
            const file = file_item.path
            const last_slash_index = file.lastIndexOf('/')
            const filename =
              last_slash_index == -1
                ? file
                : file.substring(last_slash_index + 1)
            const dir_path =
              last_slash_index == -1 ? '' : file.substring(0, last_slash_index)

            return (
              <label key={file} className={styles.files__item}>
                <Checkbox
                  checked={selected_files.includes(file)}
                  on_change={(is_checked) =>
                    handle_toggle_file(file, is_checked)
                  }
                />
                <div
                  className={cn(styles.files__item__details, {
                    [styles['files__item__details--new']]:
                      file_item.status == UNTRACKED_STATUS,
                    [styles['files__item__details--modified']]:
                      file_item.status == MODIFIED_STATUS,
                    [styles['files__item__details--deleted']]:
                      file_item.status == DELETED_STATUS
                  })}
                  title={file}
                >
                  <span>{filename}</span>
                  {dir_path && (
                    <span className={styles.files__item__path}>{dir_path}</span>
                  )}
                </div>
                <div className={styles.files__item__actions}>
                  {file_item.status != UNTRACKED_STATUS &&
                    file_item.status != DELETED_STATUS && (
                      <IconButton
                        codicon_icon="diff-single"
                        title="Show Diff"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_show_diff(file)
                        }}
                      />
                    )}
                  {file_item.status != DELETED_STATUS && (
                    <IconButton
                      codicon_icon="go-to-file"
                      title="Go To File"
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_go_to_file(file)
                      }}
                    />
                  )}
                </div>
              </label>
            )
          })}
        </div>
      }
      footer_slot={
        <>
          <Button on_click={props.on_cancel} is_secondary={true}>
            Cancel
          </Button>
          <Button
            on_click={handle_stage}
            disabled={selected_files.length == 0}
            is_focused={true}
          >
            Proceed
          </Button>
        </>
      }
    />
  )
}

import { useState } from 'react'
import styles from './StageFilesModal.module.scss'
import { Button } from '../../Button'
import { Modal } from '../Modal'
import { Checkbox } from '../../../common/Checkbox'

type Props = {
  files: string[]
  on_stage: (files_to_stage: string[]) => void
  on_cancel: () => void
}

export const StageFilesModal: React.FC<Props> = (props) => {
  const [selected_files, set_selected_files] = useState<string[]>(props.files)

  const handle_toggle_file = (file: string, is_checked: boolean) => {
    if (is_checked) {
      set_selected_files((prev) => [...prev, file])
    } else {
      set_selected_files((prev) => prev.filter((f) => f !== file))
    }
  }

  const handle_toggle_select_all = (is_checked: boolean) => {
    if (is_checked) {
      set_selected_files(props.files)
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
      content_slot={
        <div className={styles.files}>
          <label className={styles.files__item}>
            <Checkbox
              checked={all_selected}
              on_change={handle_toggle_select_all}
            />
            <div className={styles.files__item__details}>
              <strong>Select all</strong>
            </div>
          </label>
          {props.files.map((file) => {
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
                <div className={styles.files__item__details} title={file}>
                  <span>{filename}</span>
                  {dir_path && (
                    <span className={styles.files__item__path}>{dir_path}</span>
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

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

  const handle_stage = () => {
    props.on_stage(selected_files)
  }

  return (
    <Modal
      title="Select files"
      content_max_height="30vh"
      content_slot={
        <div className={styles.files}>
          {props.files.map((file) => (
            <label key={file} className={styles.files__item}>
              <Checkbox
                checked={selected_files.includes(file)}
                on_change={(is_checked) => handle_toggle_file(file, is_checked)}
              />
              <span>{file}</span>
            </label>
          ))}
        </div>
      }
      footer_slot={
        <div className={styles.actions}>
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
        </div>
      }
    />
  )
}

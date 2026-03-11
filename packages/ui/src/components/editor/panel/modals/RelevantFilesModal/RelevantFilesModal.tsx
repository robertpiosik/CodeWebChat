import { useState } from 'react'
import styles from './RelevantFilesModal.module.scss'
import { Button } from '../../../common/Button'
import { Modal } from '../Modal'
import { Checkbox } from '../../../common/Checkbox'
import { IconButton } from '../../../common/IconButton'
import cn from 'classnames'

type Props = {
  files: { file_path: string; relative_path: string; token_count?: number }[]
  on_accept: (files: string[]) => void
  on_cancel: () => void
  on_go_to_file: (file: string) => void
}

export const RelevantFilesModal: React.FC<Props> = (props) => {
  const [selected_files, set_selected_files] = useState<string[]>(
    props.files.map((f) => f.file_path)
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
      set_selected_files(props.files.map((f) => f.file_path))
    } else {
      set_selected_files([])
    }
  }

  const all_selected =
    props.files.length > 0 && selected_files.length === props.files.length

  const handle_accept = () => {
    props.on_accept(selected_files)
  }

  const format_tokens = (tokens?: number) => {
    if (tokens === undefined) return ''
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key == 'Escape') {
          e.stopPropagation()
          props.on_cancel()
        }
      }}
    >
      <Modal
        title="Search Results"
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
              const file = file_item.relative_path
              const last_slash_index = file.lastIndexOf('/')
              const filename =
                last_slash_index == -1
                  ? file
                  : file.substring(last_slash_index + 1)
              const dir_path =
                last_slash_index == -1
                  ? ''
                  : file.substring(0, last_slash_index)

              const token_str = format_tokens(file_item.token_count)

              return (
                <label key={file_item.file_path} className={styles.files__item}>
                  <Checkbox
                    checked={selected_files.includes(file_item.file_path)}
                    on_change={(is_checked) =>
                      handle_toggle_file(file_item.file_path, is_checked)
                    }
                  />
                  <div
                    className={styles.files__item__details}
                    title={file_item.file_path}
                  >
                    <span>{filename}</span>
                    {(dir_path || token_str) && (
                      <span className={styles.files__item__path}>
                        {token_str && (
                          <span className={styles.files__item__tokens}>
                            {token_str}
                          </span>
                        )}
                        {token_str && dir_path && ' · '}
                        {dir_path && <span>{dir_path}</span>}
                      </span>
                    )}
                  </div>
                  <div className={styles.files__item__actions}>
                    <IconButton
                      codicon_icon="go-to-file"
                      title="Go To File"
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_go_to_file(file_item.file_path)
                      }}
                    />
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
              on_click={handle_accept}
              disabled={selected_files.length == 0}
              is_focused={true}
            >
              Confirm
            </Button>
          </>
        }
      />
    </div>
  )
}

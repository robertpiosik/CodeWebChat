import { FC, useState, useEffect } from 'react'
import { FileInReview } from '@shared/types/file-in-review'
import cn from 'classnames'
import styles from './CodeReview.module.scss'
import { Button } from '../Button'
import { Checkbox } from '../Checkbox'

type CheckedFileToReview = FileInReview & { is_checked: boolean }

type Props = {
  files: FileInReview[]
  has_multiple_workspaces: boolean
  on_reject: () => void
  on_accept: (files: FileInReview[]) => void
  on_focus_file: (file: { file_path: string; workspace_name?: string }) => void
}

export const CodeReview: FC<Props> = ({
  files,
  has_multiple_workspaces,
  on_reject,
  on_accept,
  on_focus_file
}) => {
  const [files_to_review, set_files_to_review] = useState<
    CheckedFileToReview[]
  >([])
  const [last_clicked_file_index, set_last_clicked_file_index] = useState(0)

  useEffect(() => {
    set_files_to_review(files.map((f) => ({ ...f, is_checked: true })))
    set_last_clicked_file_index(0)
  }, [files])

  const handle_accept = () => {
    const accepted_files = files_to_review.filter((f) => f.is_checked)
    on_accept(accepted_files)
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {files_to_review.map((file, index) => {
          const last_slash_index = file.file_path.lastIndexOf('/')
          const file_name = file.file_path.substring(last_slash_index + 1)
          const dir_path =
            last_slash_index > -1
              ? file.file_path.substring(0, last_slash_index)
              : ''
          return (
            <div
              key={`${file.workspace_name ?? ''}:${file.file_path}`}
              className={cn(styles.item, {
                [styles['item--selected']]: index == last_clicked_file_index
              })}
              onClick={() => {
                set_last_clicked_file_index(index)
                on_focus_file({
                  file_path: file.file_path,
                  workspace_name: file.workspace_name
                })
              }}
              role="button"
              title={file.file_path}
            >
              <Checkbox
                checked={file.is_checked}
                on_change={(checked) => {
                  set_files_to_review((prev) =>
                    prev.map((f, i) =>
                      i == index ? { ...f, is_checked: checked } : f
                    )
                  )
                }}
                disabled={files_to_review.length == 1}
              />
              <div className={styles['item__label']}>
                <span>
                  {file.is_new ? 'New: ' : ''} {file_name}
                </span>
                <span>
                  {has_multiple_workspaces && file.workspace_name
                    ? `${file.workspace_name}/`
                    : ''}
                  {dir_path}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.footer}>
        <Button on_click={on_reject} is_secondary>
          Reject
        </Button>
        <Button
          on_click={handle_accept}
          disabled={files_to_review.filter((f) => f.is_checked).length == 0}
        >
          Accept
        </Button>
      </div>
    </div>
  )
}

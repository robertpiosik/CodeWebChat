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
  on_reject_all: () => void
  on_accept: (files: FileInReview[]) => void
  on_focus_file: (file: { file_path: string; workspace_name?: string }) => void
  on_toggle_file: (file: {
    file_path: string
    workspace_name?: string
    is_checked: boolean
  }) => void
}

export const CodeReview: FC<Props> = ({
  files,
  has_multiple_workspaces,
  on_reject_all,
  on_accept,
  on_focus_file,
  on_toggle_file
}) => {
  const [files_to_review, set_files_to_review] = useState<
    CheckedFileToReview[]
  >([])
  const [last_clicked_file_index, set_last_clicked_file_index] = useState(0)

  useEffect(() => {
    set_files_to_review(files.map((f) => ({ ...f, is_checked: true })))
    set_last_clicked_file_index(0)
  }, [files])

  const handle_keep = () => {
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
              <div className={styles['item__left']}>
                {files_to_review.length > 1 && (
                  <Checkbox
                    checked={file.is_checked}
                    on_change={(checked) => {
                      set_files_to_review((prev) =>
                        prev.map((f, i) =>
                          i == index ? { ...f, is_checked: checked } : f
                        )
                      )
                      on_toggle_file({
                        file_path: file.file_path,
                        workspace_name: file.workspace_name,
                        is_checked: checked
                      })
                    }}
                  />
                )}
                <div
                  className={cn(styles['item__left__label'], {
                    [styles['item__left__label--new']]: file.is_new,
                    [styles['item__left__label--deleted']]: file.is_deleted
                  })}
                >
                  <span>{file_name}</span>

                  <span>
                    {has_multiple_workspaces && file.workspace_name
                      ? `${file.workspace_name}/`
                      : ''}
                    {dir_path}
                  </span>
                </div>
              </div>
              {!file.is_deleted && (
                <div className={styles['item__line-numbers']}>
                  <span className={styles['item__line-numbers__added']}>
                    +{file.lines_added}
                  </span>
                  <span className={styles['item__line-numbers__removed']}>
                    -{file.lines_removed}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className={styles.footer}>
        <Button on_click={on_reject_all} is_secondary>
          {files_to_review.length > 1 ? 'Reject All' : 'Reject'}
        </Button>
        <Button
          on_click={handle_keep}
          disabled={files_to_review.filter((f) => f.is_checked).length == 0}
        >
          {files_to_review.length > 1 ? 'Accept Selected' : 'Accept'}
        </Button>
      </div>
    </div>
  )
}

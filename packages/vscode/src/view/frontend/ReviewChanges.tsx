import { FC, useState, useEffect } from 'react'
import { FileToReview } from '../types/messages'
import cn from 'classnames'
import styles from './ReviewChanges.module.scss'
import { Button } from '@ui/components/editor/Button'
import { Checkbox } from '@ui/components/editor/Checkbox'

type CheckedFileToReview = FileToReview & { isChecked: boolean }

type Props = {
  files: FileToReview[]
  on_reject: () => void
  on_accept: (files: FileToReview[]) => void
  on_focus_file: (file: { file_path: string; workspace_name?: string }) => void
}

export const ReviewChanges: FC<Props> = ({
  files,
  on_reject,
  on_accept,
  on_focus_file
}) => {
  const [files_to_review, set_files_to_review] = useState<
    CheckedFileToReview[]
  >([])
  const [last_clicked_file_index, set_last_clicked_file_index] = useState(0)

  useEffect(() => {
    set_files_to_review(files.map((f) => ({ ...f, isChecked: true })))
    set_last_clicked_file_index(0)
  }, [files])

  const handle_accept = () => {
    const accepted_files = files_to_review.filter((f) => f.isChecked)
    on_accept(accepted_files)
  }

  return (
    <div className={styles['review-changes-container']}>
      <ul>
        {files_to_review.map((file, index) => {
          return (
            <li
              key={`${file.workspace_name ?? ''}:${file.file_path}:${index}`}
              className={cn(styles['review-changes-item'], {
                [styles['review-changes-item--selected']]:
                  index == last_clicked_file_index
              })}
            >
              <Checkbox
                checked={file.isChecked}
                on_change={(checked) => {
                  set_files_to_review((prev) =>
                    prev.map((f, i) =>
                      i == index ? { ...f, isChecked: checked } : f
                    )
                  )
                }}
              />
              <span
                className={styles['review-changes-item-label']}
                onClick={() => {
                  set_last_clicked_file_index(index)
                  on_focus_file({
                    file_path: file.file_path,
                    workspace_name: file.workspace_name
                  })
                }}
                title="Click to view this change"
              >
                {file.workspace_name ? `${file.workspace_name}/` : ''}
                {file.file_path} {file.is_new ? ' (new)' : ''}
              </span>
            </li>
          )
        })}
      </ul>
      <div className={styles['review-changes-footer']}>
        <Button on_click={on_reject}>Reject</Button>
        <Button on_click={handle_accept}>Accept</Button>
      </div>
    </div>
  )
}

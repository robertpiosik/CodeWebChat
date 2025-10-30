import { FC, useState, useMemo } from 'react'
import { FileInReview } from '@shared/types/file-in-review'
import cn from 'classnames'
import styles from './ResponseReview.module.scss'
import { Button } from '../Button'
import { Checkbox } from '../../common/Checkbox'
import { IconButton } from '../IconButton/IconButton'

type Props = {
  files: FileInReview[]
  has_multiple_workspaces: boolean
  on_discard: () => void
  on_approve: (files: FileInReview[]) => void
  on_focus_file: (file: { file_path: string; workspace_name?: string }) => void
  on_go_to_file: (file: { file_path: string; workspace_name?: string }) => void
  on_intelligent_update: (file: {
    file_path: string
    workspace_name?: string
  }) => void
  on_toggle_file: (file: {
    file_path: string
    workspace_name?: string
    is_checked: boolean
  }) => void
  raw_instructions?: string
}

export const ResponseReview: FC<Props> = ({
  files,
  has_multiple_workspaces,
  on_discard,
  on_approve,
  on_focus_file,
  on_go_to_file,
  on_toggle_file,
  on_intelligent_update,
  raw_instructions
}) => {
  const [last_clicked_file_index, set_last_clicked_file_index] = useState(0)

  const handle_approve = () => {
    const accepted_files = files.filter((f) => f.is_checked)
    on_approve(accepted_files)
  }

  const fallback_count = files.filter((f) => f.is_fallback).length

  const sorted_files = useMemo(() => {
    const get_sort_score = (file: FileInReview): number => {
      if (file.diff_fallback_method == 'search_and_replace') {
        return 0
      }
      if (file.diff_fallback_method == 'recount') {
        return 1
      }
      return 2
    }
    return [...files].sort((a, b) => get_sort_score(a) - get_sort_score(b))
  }, [files])

  return (
    <div className={styles.container}>
      {raw_instructions && (
        <div className={styles.instructions} title={raw_instructions}>
          {raw_instructions}
        </div>
      )}
      {fallback_count > 0 && (
        <div className={styles.info}>
          {files.length > 1
            ? `${fallback_count} of ${files.length} files`
            : 'The file'}{' '}
          required a fallback diff integration method, which may lead to
          inaccuracies. Looks off? Click{' '}
          <span className="codicon codicon-sparkle" /> action to fix a file with
          the Intelligent Update API tool.
        </div>
      )}
      <div className={styles.list}>
        {sorted_files.map((file, index) => {
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
              title={`${file.file_path}${
                file.diff_fallback_method == 'search_and_replace'
                  ? '\nUsed aggressive fallback method. Call Intelligent Update API tool, if needed.'
                  : ''
              }`}
            >
              <div className={styles['item__left']}>
                {files.length > 1 && (
                  <Checkbox
                    checked={file.is_checked}
                    on_change={(checked) => {
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
                  <span>
                    {file.diff_fallback_method == 'search_and_replace' && '⚠ '}
                    {file_name}
                  </span>

                  <span>
                    {has_multiple_workspaces && file.workspace_name
                      ? `${file.workspace_name}/`
                      : ''}
                    {dir_path}
                  </span>
                </div>
              </div>
              <div className={styles.item__right}>
                <div className={styles['item__actions']}>
                  {(file.is_fallback || file.is_replaced) && (
                    <IconButton
                      codicon_icon="sparkle"
                      title={`Call Intelligent Update API tool${
                        file.diff_fallback_method == 'recount'
                          ? ' (fallback used: git apply with --recount flag)'
                          : file.diff_fallback_method == 'search_and_replace'
                          ? ' (fallback used: search and replace matching fragments)'
                          : ''
                      }`}
                      on_click={(e) => {
                        e.stopPropagation()
                        set_last_clicked_file_index(index)
                        on_intelligent_update({
                          file_path: file.file_path,
                          workspace_name: file.workspace_name
                        })
                      }}
                    />
                  )}
                  <IconButton
                    codicon_icon="diff-single"
                    title="Open Changes"
                    on_click={(e) => {
                      e.stopPropagation()
                      set_last_clicked_file_index(index)
                      on_focus_file({
                        file_path: file.file_path,
                        workspace_name: file.workspace_name
                      })
                    }}
                  />
                  <IconButton
                    codicon_icon="go-to-file"
                    title="Go To File"
                    on_click={(e) => {
                      e.stopPropagation()
                      on_go_to_file({
                        file_path: file.file_path,
                        workspace_name: file.workspace_name
                      })
                    }}
                  />
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
            </div>
          )
        })}
      </div>
      <div className={styles.footer}>
        <Button on_click={on_discard} is_secondary>
          Discard
        </Button>
        <Button
          on_click={handle_approve}
          disabled={files.filter((f) => f.is_checked).length == 0}
        >
          Approve
        </Button>
      </div>
    </div>
  )
}

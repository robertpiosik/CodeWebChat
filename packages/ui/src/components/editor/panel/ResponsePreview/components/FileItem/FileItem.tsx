import { FC } from 'react'
import cn from 'classnames'
import { FileInPreview } from '@shared/types/file-in-preview'
import styles from './FileItem.module.scss'
import { Checkbox } from '../../../../common/Checkbox'
import { IconButton } from '../../../IconButton/IconButton'

type Props = {
  file: FileInPreview
  is_selected: boolean
  has_multiple_workspaces: boolean
  total_files_count: number
  on_click: () => void
  on_toggle: (checked: boolean) => void
  on_discard_user_changes: () => void
  on_preview_generated_code: () => void
  on_intelligent_update: () => void
  on_go_to_file: () => void
}

type FileMessage =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string; show_actions: boolean }
  | { type: 'warning'; text: string; show_actions: boolean }

const get_file_message = (file: FileInPreview): FileMessage | null => {
  if (file.fixed_with_intelligent_update) {
    return {
      type: 'success',
      text: 'Fixed successfully'
    }
  } else if (file.apply_failed) {
    return {
      type: 'error',
      text: 'Failed to apply changes',
      show_actions: true
    }
  } else if (file.diff_application_method == 'search_and_replace') {
    return {
      type: 'warning',
      text: 'Used aggressive fallback method',
      show_actions: true
    }
  } else {
    return null
  }
}

export const FileItem: FC<Props> = ({
  file,
  is_selected,
  has_multiple_workspaces,
  total_files_count,
  on_click,
  on_toggle,
  on_discard_user_changes,
  on_preview_generated_code,
  on_intelligent_update,
  on_go_to_file
}) => {
  const message_obj = get_file_message(file)
  const last_slash_index = file.file_path.lastIndexOf('/')
  const file_name = file.file_path.substring(last_slash_index + 1)
  const dir_path =
    last_slash_index > -1 ? file.file_path.substring(0, last_slash_index) : ''

  const render_apply_progress = () => {
    if (!file.is_applying) return null

    let status_text = ''
    if (file.apply_status == 'waiting') status_text = 'Waiting...'
    else if (file.apply_status == 'thinking') status_text = 'Thinking...'
    else if (file.apply_status == 'retrying') status_text = 'Retrying...'
    else if (file.apply_status == 'receiving') {
      const progress = file.apply_progress ?? 0
      const tps = file.apply_tokens_per_second
      status_text = `${progress}%`
      if (tps) status_text += ` (${tps} t/s)`
    } else if (file.apply_status == 'done') status_text = 'Done'

    return (
      <div className={styles.progress}>
        <span>{status_text}</span>
        <span className="codicon codicon-loading codicon-modifier-spin" />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div
        className={cn(styles.file, {
          [styles['file--selected']]: is_selected,
          [styles['file--error']]:
            file.apply_failed && !file.fixed_with_intelligent_update,
          [styles['file--warning']]:
            file.diff_application_method == 'search_and_replace' &&
            !file.fixed_with_intelligent_update
        })}
        onClick={on_click}
        role="button"
        title={file.file_path}
      >
        <div className={styles['file__left']}>
          {total_files_count > 1 && (
            <Checkbox checked={file.is_checked} on_change={on_toggle} />
          )}
          <div
            className={cn(styles['file__left__label'], {
              [styles['file__left__label--new']]: file.file_state == 'new',
              [styles['file__left__label--deleted']]:
                file.file_state == 'deleted'
            })}
          >
            <span>{file_name}</span>

            <span>
              {has_multiple_workspaces && file.workspace_name
                ? `${file.workspace_name}${dir_path ? '/' : ''}`
                : ''}
              {dir_path}
            </span>
          </div>
        </div>
        <div className={styles['file__right']}>
          {file.is_applying ? (
            render_apply_progress()
          ) : (
            <>
              <div className={styles['file__actions']}>
                {file.content !== undefined &&
                  file.proposed_content !== undefined &&
                  file.content !== file.proposed_content && (
                    <IconButton
                      codicon_icon="discard"
                      title="Discard user changes"
                      on_click={(e) => {
                        e.stopPropagation()
                        on_discard_user_changes()
                      }}
                    />
                  )}
                {file.ai_content && (
                  <IconButton
                    codicon_icon="open-preview"
                    title="Preview generated code"
                    on_click={(e) => {
                      e.stopPropagation()
                      on_preview_generated_code()
                    }}
                  />
                )}
                <IconButton
                  codicon_icon="sparkle"
                  title="Fix with Intelligent Update API tool"
                  on_click={(e) => {
                    e.stopPropagation()
                    on_intelligent_update()
                  }}
                />
                <IconButton
                  codicon_icon="go-to-file"
                  title="Go to file"
                  on_click={(e) => {
                    e.stopPropagation()
                    on_go_to_file()
                  }}
                />
              </div>
              <div className={styles['file__line-numbers']}>
                {file.file_state != 'deleted' && (
                  <span className={styles['file__line-numbers__added']}>
                    +{file.lines_added}
                  </span>
                )}
                {file.file_state != 'new' && (
                  <span className={styles['file__line-numbers__removed']}>
                    -{file.lines_removed}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {message_obj && (
        <div
          className={cn(styles.message, {
            [styles['message--error']]: message_obj.type == 'error',
            [styles['message--warning']]: message_obj.type == 'warning'
          })}
        >
          <div className={styles['message__content']}>
            {message_obj.type == 'success' && (
              <span className="codicon codicon-check" />
            )}
            {message_obj.type == 'error' && (
              <span className="codicon codicon-error" />
            )}
            {message_obj.type == 'warning' && (
              <span className="codicon codicon-warning" />
            )}
            <span>{message_obj.text}</span>
          </div>
          {'show_actions' in message_obj && message_obj.show_actions && (
            <div className={styles['message__actions']}>
              {file.ai_content && !file.is_applying && (
                <div
                  className={styles['message__actions__item']}
                  onClick={on_preview_generated_code}
                  title="Preview generated code"
                >
                  <span className="codicon codicon-open-preview" />
                  <span>Preview</span>
                </div>
              )}
              {!file.is_applying && (
                <div
                  className={styles['message__actions__item']}
                  onClick={on_intelligent_update}
                  title={'Fix with Intelligent Update API tool'}
                >
                  <span className="codicon codicon-sparkle" />
                  <span>Fix</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { FC, useEffect, useState } from 'react'
import cn from 'classnames'
import { FileInPreview } from '@shared/types/file-in-preview'
import styles from './FileItem.module.scss'
import { Checkbox } from '../../../../common/Checkbox'
import { IconButton } from '../../../../common/IconButton'

type Props = {
  file: FileInPreview
  is_selected: boolean
  has_multiple_workspaces: boolean
  total_files_count: number
  on_click: () => void
  on_toggle: (checked: boolean) => void
  on_discard_user_changes: () => void
  on_preview_generated_code: () => void
  on_intelligent_update: (force_model_selection?: boolean) => void
  on_cancel_intelligent_update: () => void
  on_go_to_file: () => void
}

type FileMessage =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string }
  | { type: 'warning'; text: string }
  | { type: 'loading'; text: string }

const get_file_message = (file: FileInPreview): FileMessage | null => {
  if (file.is_applying) {
    let text = 'Applying...'
    if (file.apply_status == 'waiting') text = 'Waiting...'
    else if (file.apply_status == 'thinking') text = 'Thinking...'
    else if (file.apply_status == 'retrying') text = 'Retrying...'
    else if (file.apply_status == 'receiving') text = 'Receiving...'
    else if (file.apply_status == 'done') text = 'Done'

    return {
      type: 'loading',
      text
    }
  } else if (file.applied_with_intelligent_update) {
    return {
      type: 'success',
      text: 'Applied with Intelligent Update'
    }
  } else if (file.apply_failed) {
    return {
      type: 'error',
      text: 'Failed to apply changes'
    }
  } else if (file.diff_application_method == 'search_and_replace') {
    return {
      type: 'warning',
      text: 'Used aggressive fallback method'
    }
  } else {
    return null
  }
}

export const FileItem: FC<Props> = (props) => {
  const [elapsed_seconds, set_elapsed_seconds] = useState(0.0)

  useEffect(() => {
    if (!props.file.is_applying) {
      set_elapsed_seconds(0)
      return
    }

    const interval = setInterval(() => {
      set_elapsed_seconds((prev) => prev + 0.1)
    }, 100)
    return () => clearInterval(interval)
  }, [props.file.is_applying])

  const message_obj = get_file_message(props.file)
  const last_slash_index = props.file.file_path.lastIndexOf('/')
  const file_name = props.file.file_path.substring(last_slash_index + 1)
  const dir_path =
    last_slash_index > -1
      ? props.file.file_path.substring(0, last_slash_index)
      : ''

  const render_apply_progress = () => {
    if (!props.file.is_applying) return null

    let status_text = ''
    if (props.file.apply_status == 'receiving') {
      const tps = props.file.apply_tokens_per_second
      if (tps) status_text = `${tps} tokens/s`
    }

    return (
      <div className={styles.progress}>
        {status_text && <span>{status_text}</span>}
        <span>{elapsed_seconds.toFixed(1)}s</span>
        {props.file.apply_status != 'done' && (
          <div
            className={styles.progress__cancel}
            onClick={(e) => {
              e.stopPropagation()
              props.on_cancel_intelligent_update()
            }}
            title="Cancel"
          >
            <span className="codicon codicon-close" />
          </div>
        )}
      </div>
    )
  }

  const progress =
    props.file.apply_status == 'receiving'
      ? (props.file.apply_progress ?? 0)
      : 0
  const container_style =
    props.file.apply_status == 'receiving'
      ? {
          backgroundImage: `linear-gradient(to right, var(--cwc-bg-secondary) ${progress}%, transparent ${progress}%)`
        }
      : undefined

  return (
    <div className={styles.container}>
      <div
        className={cn(styles.file, {
          [styles['file--selected']]: props.is_selected,
          [styles['file--deleted']]: props.file.file_state == 'deleted'
        })}
        onClick={
          props.file.file_state == 'deleted' ? undefined : props.on_click
        }
        style={container_style}
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
          <div
            className={cn(styles['file__left__label'], {
              [styles['file__left__label--new']]:
                props.file.file_state == 'new',
              [styles['file__left__label--deleted']]:
                props.file.file_state == 'deleted'
            })}
          >
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
          {props.file.is_applying ? (
            render_apply_progress()
          ) : (
            <>
              <div className={styles['file__actions']}>
                {props.file.content !== undefined &&
                  props.file.proposed_content !== undefined &&
                  props.file.content != props.file.proposed_content && (
                    <IconButton
                      codicon_icon="discard"
                      title="Discard user changes"
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_discard_user_changes()
                      }}
                    />
                  )}
                {props.file.ai_content && (
                  <IconButton
                    codicon_icon="open-preview"
                    title="Preview generated code"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preview_generated_code()
                    }}
                  />
                )}
                {props.file.file_state != 'new' &&
                  props.file.file_state != 'deleted' && (
                    <IconButton
                      codicon_icon="sparkle"
                      title="Apply with Intelligent Update API tool"
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_intelligent_update(
                          !!props.file.applied_with_intelligent_update
                        )
                      }}
                    />
                  )}
                {props.file.file_state != 'deleted' && (
                  <IconButton
                    codicon_icon="go-to-file"
                    title="Go to file"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_go_to_file()
                    }}
                  />
                )}
              </div>
              <div className={styles['file__line-numbers']}>
                {props.file.file_state != 'deleted' && (
                  <span className={styles['file__line-numbers__added']}>
                    +{props.file.lines_added}
                  </span>
                )}
                {props.file.file_state != 'new' && (
                  <span className={styles['file__line-numbers__removed']}>
                    -{props.file.lines_removed}
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
            [styles['message--warning']]: message_obj.type == 'warning',
            [styles['message--success']]: message_obj.type == 'success',
            [styles['message--loading']]: message_obj.type == 'loading'
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
            {message_obj.type == 'loading' && (
              <span className="codicon codicon-loading codicon-modifier-spin" />
            )}
            <span>{message_obj.text}</span>
          </div>
          <div className={styles['message__actions']}>
            {props.file.ai_content && (
              <div
                className={styles['message__actions__item']}
                onClick={props.on_preview_generated_code}
                title="Preview generated code"
              >
                <span className="codicon codicon-open-preview" />
                <span>Preview</span>
              </div>
            )}
            {!props.file.is_applying && (
              <div
                className={styles['message__actions__item']}
                onClick={() =>
                  props.on_intelligent_update(
                    !!props.file.applied_with_intelligent_update
                  )
                }
                title="Apply with Intelligent Update API tool"
              >
                <span className="codicon codicon-sparkle" />
                <span>
                  {props.file.applied_with_intelligent_update ? 'Retry' : 'Fix'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

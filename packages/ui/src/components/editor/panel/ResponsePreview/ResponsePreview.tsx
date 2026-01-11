import { FC, useRef, useState, useMemo } from 'react'
import { FileInPreview, ItemInPreview } from '@shared/types/file-in-preview'
import cn from 'classnames'
import styles from './ResponsePreview.module.scss'
import { Checkbox } from '../../common/Checkbox'
import { IconButton } from '../IconButton/IconButton'
import { TextItem, InlineFileItem } from './components'
import { Scrollable } from '../Scrollable'

type Props = {
  items: ItemInPreview[]
  has_multiple_workspaces: boolean
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
  on_discard_user_changes: (file: {
    file_path: string
    workspace_name?: string
  }) => void
  on_preview_generated_code: (file: {
    file_path: string
    workspace_name?: string
    content: string
  }) => void
  on_fix_all_failed: () => void
  raw_instructions?: string
}

type FileMessage =
  | { type: 'success'; text: string }
  | { type: 'error'; text: string; show_actions: boolean }
  | { type: 'warning'; text: string; show_actions: boolean }

const get_file_message = (file: FileInPreview): FileMessage | null => {
  if (file.fixed_with_intelligent_update) {
    return {
      type: 'success',
      text: 'Fixed with successfully'
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

export const ResponsePreview: FC<Props> = (props) => {
  const [last_clicked_file_index, set_last_clicked_file_index] = useState(
    props.items.findIndex((i) => i.type == 'file')
  )
  const [expanded_text_items, set_expanded_text_items] = useState<Set<number>>(
    new Set()
  )
  const scroll_top_ref = useRef(0)
  const scrollable_ref = useRef<any>(null)

  const toggle_expanded_text_item = (
    index: number,
    element: HTMLDivElement
  ) => {
    const scrollable_instance = scrollable_ref.current
    if (scrollable_instance) {
      const scroll_container = scrollable_instance.getScrollElement()
      if (scroll_container) {
        const scroll_container_rect = scroll_container.getBoundingClientRect()
        const element_rect = element.getBoundingClientRect()

        if (element_rect.top < scroll_container_rect.top) {
          // Element's top edge is above the scrollable viewport's top edge.
          // Restore scroll position to the distance of this top edge to the top.
          const element_position_in_scrollable_content =
            scroll_container.scrollTop +
            element_rect.top -
            scroll_container_rect.top -
            4
          scroll_top_ref.current = element_position_in_scrollable_content
        }
      }
    }

    set_expanded_text_items((prev) => {
      const new_set = new Set(prev)
      if (new_set.has(index)) {
        new_set.delete(index)
      } else {
        new_set.add(index)
      }
      return new_set
    })
  }

  const files_in_preview = useMemo(
    () => props.items.filter((i) => 'file_path' in i) as FileInPreview[],
    [props.items]
  )

  const aggressive_fallback_count = useMemo(
    () =>
      files_in_preview.filter(
        (f) => f.diff_application_method == 'search_and_replace'
      ).length,
    [files_in_preview]
  )

  const error_count = useMemo(
    () =>
      files_in_preview.filter(
        (f) => f.apply_failed && !f.fixed_with_intelligent_update
      ).length,
    [files_in_preview]
  )

  const get_instructions_font_size_class = (text: string): string => {
    const length = text.length
    if (length < 80) {
      return styles['instructions--large']
    } else if (length > 160) {
      return styles['instructions--small']
    }
    return ''
  }

  const render_apply_progress = (file: FileInPreview) => {
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
      <div className={styles['list__item__progress']}>
        <span>{status_text}</span>
        <span className="codicon codicon-loading codicon-modifier-spin" />
      </div>
    )
  }

  return (
    <Scrollable
      ref={scrollable_ref}
      initial_scroll_top={scroll_top_ref.current}
      scroll_trigger={expanded_text_items.size}
      on_scroll={(top) => {
        scroll_top_ref.current = top
      }}
    >
      <div className={styles.container}>
        {props.raw_instructions && (
          <div
            className={cn(
              styles.instructions,
              get_instructions_font_size_class(props.raw_instructions)
            )}
            title={props.raw_instructions}
          >
            {props.raw_instructions}
          </div>
        )}
        {error_count > 0 && (
          <div
            className={cn(styles.info, styles['info--error'])}
            title={
              files_in_preview.length > 1
                ? `${error_count} of ${files_in_preview.length} files failed to apply changes`
                : 'Failed to apply changes to the file'
            }
          >
            <div className={styles.info__content}>
              <span className="codicon codicon-error" />
              <span>
                {files_in_preview.length > 1
                  ? `${error_count} of ${files_in_preview.length} files failed to apply changes`
                  : 'Failed to apply changes to the file'}
              </span>
            </div>
            <div
              className={styles.info__action}
              onClick={() => props.on_fix_all_failed()}
            >
              <span className="codicon codicon-sparkle" />
              <span>Fix all</span>
            </div>
          </div>
        )}
        {aggressive_fallback_count > 0 && (
          <div
            className={cn(styles.info, styles['info--warning'])}
            title={`${
              files_in_preview.length > 1
                ? `${aggressive_fallback_count} of ${files_in_preview.length} files`
                : 'The file'
            }{' '}
            used aggressive fallback method`}
          >
            <div className={styles.info__content}>
              <span className="codicon codicon-warning" />
              {files_in_preview.length > 1
                ? `${aggressive_fallback_count} of ${files_in_preview.length} files used aggressive fallback method`
                : 'The file used aggressive fallback method'}
            </div>
          </div>
        )}
        <div className={styles.list}>
          {props.items.map((item, index) => {
            if (item.type == 'file') {
              const file = item
              const message_obj = get_file_message(file)
              const last_slash_index = file.file_path.lastIndexOf('/')
              const file_name = file.file_path.substring(last_slash_index + 1)
              const dir_path =
                last_slash_index > -1
                  ? file.file_path.substring(0, last_slash_index)
                  : ''
              return (
                <div key={index} className={styles['list__item']}>
                  <div
                    className={cn(styles['list__item__file'], {
                      [styles['list__item__file--selected']]:
                        index == last_clicked_file_index,
                      [styles['list__item__file--error']]:
                        file.apply_failed &&
                        !file.fixed_with_intelligent_update,
                      [styles['list__item__file--warning']]:
                        file.diff_application_method == 'search_and_replace'
                    })}
                    onClick={() => {
                      set_last_clicked_file_index(index)
                      props.on_focus_file({
                        file_path: file.file_path,
                        workspace_name: file.workspace_name
                      })
                    }}
                    role="button"
                    title={file.file_path}
                  >
                    <div className={styles['list__item__file__left']}>
                      {files_in_preview.length > 1 && (
                        <Checkbox
                          checked={file.is_checked}
                          on_change={(checked) => {
                            props.on_toggle_file({
                              file_path: file.file_path,
                              workspace_name: file.workspace_name,
                              is_checked: checked
                            })
                          }}
                        />
                      )}
                      <div
                        className={cn(styles['list__item__file__left__label'], {
                          [styles['list__item__file__left__label--new']]:
                            file.file_state == 'new',
                          [styles['list__item__file__left__label--deleted']]:
                            file.file_state == 'deleted'
                        })}
                      >
                        <span>{file_name}</span>

                        <span>
                          {props.has_multiple_workspaces && file.workspace_name
                            ? `${file.workspace_name}${dir_path ? '/' : ''}`
                            : ''}
                          {dir_path}
                        </span>
                      </div>
                    </div>
                    <div className={styles['list__item__file__right']}>
                      {file.is_applying ? (
                        render_apply_progress(file)
                      ) : (
                        <>
                          <div className={styles['list__item__file__actions']}>
                            {file.content !== undefined &&
                              file.proposed_content !== undefined &&
                              file.content !== file.proposed_content && (
                                <IconButton
                                  codicon_icon="discard"
                                  title="Discard user changes"
                                  on_click={(e) => {
                                    e.stopPropagation()
                                    props.on_discard_user_changes({
                                      file_path: file.file_path,
                                      workspace_name: file.workspace_name
                                    })
                                  }}
                                />
                              )}
                            {file.ai_content && (
                              <IconButton
                                codicon_icon="open-preview"
                                title="Preview generated code"
                                on_click={(e) => {
                                  e.stopPropagation()
                                  props.on_preview_generated_code({
                                    file_path: file.file_path,
                                    workspace_name: file.workspace_name,
                                    content: file.ai_content!
                                  })
                                }}
                              />
                            )}
                            <IconButton
                              codicon_icon="sparkle"
                              title="Fix with Intelligent Update API tool"
                              on_click={(e) => {
                                e.stopPropagation()
                                props.on_intelligent_update({
                                  file_path: file.file_path,
                                  workspace_name: file.workspace_name
                                })
                              }}
                            />
                            <IconButton
                              codicon_icon="go-to-file"
                              title="Go to file"
                              on_click={(e) => {
                                e.stopPropagation()
                                props.on_go_to_file({
                                  file_path: file.file_path,
                                  workspace_name: file.workspace_name
                                })
                              }}
                            />
                          </div>
                          <div
                            className={styles['list__item__file__line-numbers']}
                          >
                            {file.file_state != 'deleted' && (
                              <span
                                className={
                                  styles[
                                    'list__item__file__line-numbers__added'
                                  ]
                                }
                              >
                                +{file.lines_added}
                              </span>
                            )}
                            {file.file_state != 'new' && (
                              <span
                                className={
                                  styles[
                                    'list__item__file__line-numbers__removed'
                                  ]
                                }
                              >
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
                      className={cn(styles['list__message'], {
                        [styles['list__message--error']]:
                          message_obj.type == 'error',
                        [styles['list__message--warning']]:
                          message_obj.type == 'warning'
                      })}
                    >
                      <div className={styles['list__message__content']}>
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
                      {'show_actions' in message_obj &&
                        message_obj.show_actions && (
                          <div className={styles['list__message__actions']}>
                            {file.ai_content && (
                              <div
                                className={
                                  styles['list__message__actions__item']
                                }
                                onClick={() =>
                                  props.on_preview_generated_code({
                                    file_path: file.file_path,
                                    workspace_name: file.workspace_name,
                                    content: file.ai_content!
                                  })
                                }
                                title="Preview generated code"
                              >
                                <span className="codicon codicon-open-preview" />
                                <span>Preview</span>
                              </div>
                            )}
                            {!file.is_applying && (
                              <div
                                className={
                                  styles['list__message__actions__item']
                                }
                                onClick={() =>
                                  props.on_intelligent_update({
                                    file_path: file.file_path,
                                    workspace_name: file.workspace_name
                                  })
                                }
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
            } else if (item.type == 'inline-file') {
              return (
                <InlineFileItem
                  key={index}
                  content={item.content}
                  language={item.language}
                  is_expanded={expanded_text_items.has(index)}
                  on_toggle={(element) =>
                    toggle_expanded_text_item(index, element)
                  }
                />
              )
            } else if (item.type == 'text') {
              return (
                <TextItem
                  key={index}
                  content={item.content}
                  is_expanded={expanded_text_items.has(index)}
                  on_toggle={(element) =>
                    toggle_expanded_text_item(index, element)
                  }
                />
              )
            }
          })}
        </div>
      </div>
    </Scrollable>
  )
}

import { FC, useRef, useState, useMemo, useEffect } from 'react'
import { FileInPreview, ItemInPreview } from '@shared/types/file-in-preview'
import cn from 'classnames'
import styles from './ResponsePreview.module.scss'
import { TextItem, InlineFileItem, FileItem } from './components'
import { Scrollable } from '../Scrollable'

type Props = {
  items: ItemInPreview[]
  has_multiple_workspaces: boolean
  on_focus_file: (file: { file_path: string; workspace_name?: string }) => void
  on_go_to_file: (file: { file_path: string; workspace_name?: string }) => void
  on_intelligent_update: (file: {
    file_path: string
    workspace_name?: string
    force_model_selection?: boolean
  }) => void
  on_cancel_intelligent_update: (file: {
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
  on_fix_all_failed: (
    files: { file_path: string; workspace_name?: string }[]
  ) => void
  raw_instructions?: string
}

export const ResponsePreview: FC<Props> = (props) => {
  const [last_clicked_file_index, set_last_clicked_file_index] = useState(
    props.items.findIndex((i) => i.type == 'file')
  )
  const [expanded_text_items, set_expanded_text_items] = useState<Set<number>>(
    new Set()
  )
  const [is_fixing_all, set_is_fixing_all] = useState(false)
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

  const applying_files = useMemo(
    () => files_in_preview.filter((f) => f.is_applying),
    [files_in_preview]
  )

  const prev_applying_count = useRef(0)
  useEffect(() => {
    if (prev_applying_count.current > 0 && applying_files.length == 0) {
      set_is_fixing_all(false)
    }
    prev_applying_count.current = applying_files.length
  }, [applying_files.length])

  const aggressive_fallback_count = useMemo(
    () =>
      files_in_preview.filter(
        (f) =>
          f.diff_application_method == 'search_and_replace' &&
          !f.fixed_with_intelligent_update &&
          !f.is_applying
      ).length,
    [files_in_preview]
  )

  const error_count = useMemo(
    () =>
      files_in_preview.filter(
        (f) =>
          f.apply_failed && !f.fixed_with_intelligent_update && !f.is_applying
      ).length,
    [files_in_preview]
  )

  const get_status_text = (file: FileInPreview) => {
    if (file.apply_status == 'waiting') return 'Waiting...'
    if (file.apply_status == 'thinking') return 'Thinking...'
    if (file.apply_status == 'retrying') return 'Retrying...'
    if (file.apply_status == 'receiving') return 'Receiving...'
    if (file.apply_status == 'done') return 'Done'
    return ''
  }

  const get_file_name = (path: string) => {
    const last_slash_index = path.lastIndexOf('/')
    return path.substring(last_slash_index + 1)
  }

  const get_dir_path = (path: string) => {
    const last_slash_index = path.lastIndexOf('/')
    return last_slash_index > -1 ? path.substring(0, last_slash_index) : ''
  }

  const get_instructions_font_size_class = (text: string): string => {
    const length = text.length
    if (length < 80) {
      return styles['instructions--large']
    } else if (length > 160) {
      return styles['instructions--small']
    }
    return ''
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
        {applying_files.length > 0 && is_fixing_all && (
          <div className={styles['fix-all-progress']}>
            {applying_files.map((file) => (
              <div
                key={file.file_path}
                className={styles['fix-all-progress__item']}
              >
                <div className={styles['fix-all-progress__header']}>
                  <div className={styles['fix-all-progress__header__name']}>
                    <span>{get_file_name(file.file_path)}</span>
                    <span>
                      {props.has_multiple_workspaces && file.workspace_name
                        ? `${file.workspace_name}${get_dir_path(file.file_path) ? '/' : ''}`
                        : ''}
                      {get_dir_path(file.file_path)}
                    </span>
                  </div>
                  <span className={styles['fix-all-progress__header__status']}>
                    {get_status_text(file)}
                  </span>
                </div>
                <div className={styles['fix-all-progress__bar']}>
                  <div
                    className={styles['fix-all-progress__bar__fill']}
                    style={{ width: `${file.apply_progress || 0}%` }}
                  />
                </div>
              </div>
            ))}
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
              onClick={() => {
                set_is_fixing_all(true)
                const files_to_fix = files_in_preview
                  .filter(
                    (f) =>
                      f.apply_failed &&
                      !f.fixed_with_intelligent_update &&
                      !f.is_applying
                  )
                  .map((f) => ({
                    file_path: f.file_path,
                    workspace_name: f.workspace_name
                  }))
                props.on_fix_all_failed(files_to_fix)
              }}
            >
              <span className="codicon codicon-sparkle" />
              <span>{error_count > 1 ? 'Fix all' : 'Fix'}</span>
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
            } used aggressive fallback method`}
          >
            <div
              className={cn(
                styles.info__content,
                styles['info__content--without-button']
              )}
            >
              <span className="codicon codicon-warning" />
              {files_in_preview.length > 1
                ? `${aggressive_fallback_count} of ${files_in_preview.length} files used aggressive fallback method`
                : 'The file used aggressive fallback method'}
            </div>
          </div>
        )}
        {/* summary of progress when clicked "Fix all" */}
        <div className={styles.list}>
          {props.items.map((item, index) => {
            if (item.type == 'file') {
              const file = item
              return (
                <FileItem
                  key={index}
                  file={file}
                  is_selected={index === last_clicked_file_index}
                  has_multiple_workspaces={props.has_multiple_workspaces}
                  total_files_count={files_in_preview.length}
                  on_click={() => {
                    set_last_clicked_file_index(index)
                    props.on_focus_file({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name
                    })
                  }}
                  on_toggle={(checked) =>
                    props.on_toggle_file({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name,
                      is_checked: checked
                    })
                  }
                  on_discard_user_changes={() =>
                    props.on_discard_user_changes({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name
                    })
                  }
                  on_preview_generated_code={() =>
                    props.on_preview_generated_code({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name,
                      content: file.ai_content!
                    })
                  }
                  on_intelligent_update={(force_model_selection) =>
                    props.on_intelligent_update({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name,
                      force_model_selection
                    })
                  }
                  on_cancel_intelligent_update={() =>
                    props.on_cancel_intelligent_update({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name
                    })
                  }
                  on_go_to_file={() =>
                    props.on_go_to_file({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name
                    })
                  }
                />
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

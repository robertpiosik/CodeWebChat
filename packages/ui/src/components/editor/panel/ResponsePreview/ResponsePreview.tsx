import { FC, useRef, useState, useMemo } from 'react'
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
  on_fix_all_failed: () => void
  raw_instructions?: string
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
        (f) =>
          f.diff_application_method == 'search_and_replace' &&
          !f.fixed_with_intelligent_update
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
                  on_intelligent_update={() =>
                    props.on_intelligent_update({
                      file_path: file.file_path,
                      workspace_name: file.workspace_name
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

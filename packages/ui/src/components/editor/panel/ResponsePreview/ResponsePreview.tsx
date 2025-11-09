import { FC, useRef, useState } from 'react'
import { FileInPreview, ItemInPreview } from '@shared/types/file-in-preview'
import cn from 'classnames'
import styles from './ResponsePreview.module.scss'
import { Checkbox } from '../../common/Checkbox'
import { IconButton } from '../IconButton/IconButton'
import { TextItem } from './components'
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

  const files_in_preview = props.items.filter(
    (i) => 'file_path' in i
  ) as FileInPreview[]
  const fallback_count = files_in_preview.filter((f) => f.is_fallback).length

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
        {fallback_count > 0 && (
          <div className={styles.info}>
            {files_in_preview.length > 1
              ? `${fallback_count} of ${files_in_preview.length} files`
              : 'The file'}{' '}
            required a fallback diff integration method, which may lead to
            inaccuracies. Looks off? Click{' '}
            <span className="codicon codicon-sparkle" /> action to fix a file
            with the Intelligent Update API tool.
          </div>
        )}
        <div className={styles.list}>
          {props.items.map((item, index) => {
            if ('file_path' in item) {
              const file = item
              const last_slash_index = file.file_path.lastIndexOf('/')
              const file_name = file.file_path.substring(last_slash_index + 1)
              const dir_path =
                last_slash_index > -1
                  ? file.file_path.substring(0, last_slash_index)
                  : ''
              return (
                <div
                  key={index}
                  className={cn(styles.list__file, {
                    [styles['list__file--selected']]:
                      index == last_clicked_file_index
                  })}
                  onClick={() => {
                    set_last_clicked_file_index(index)
                    props.on_focus_file({
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
                  <div className={styles['list__file__left']}>
                    <Checkbox
                      checked={file.is_checked}
                      disabled={files_in_preview.length == 1}
                      on_change={(checked) => {
                        props.on_toggle_file({
                          file_path: file.file_path,
                          workspace_name: file.workspace_name,
                          is_checked: checked
                        })
                      }}
                    />
                    <div
                      className={cn(styles['list__file__left__label'], {
                        [styles['list__file__left__label--new']]: file.is_new,
                        [styles['list__file__left__label--deleted']]:
                          file.is_deleted
                      })}
                    >
                      <span>
                        {file.diff_fallback_method == 'search_and_replace' &&
                          '⚠ '}
                        {file_name}
                      </span>

                      <span>
                        {props.has_multiple_workspaces && file.workspace_name
                          ? `${file.workspace_name}/`
                          : ''}
                        {dir_path}
                      </span>
                    </div>
                  </div>
                  <div className={styles.list__file__right}>
                    <div className={styles['list__file__actions']}>
                      {(file.is_fallback || file.is_replaced) && (
                        <IconButton
                          codicon_icon="sparkle"
                          title={`Call Intelligent Update API tool${
                            file.diff_fallback_method == 'recount'
                              ? ' (fallback used: git apply with --recount flag)'
                              : file.diff_fallback_method ==
                                'search_and_replace'
                              ? ' (fallback used: search and replace matching fragments)'
                              : ''
                          }`}
                          on_click={(e) => {
                            e.stopPropagation()
                            set_last_clicked_file_index(index)
                            props.on_intelligent_update({
                              file_path: file.file_path,
                              workspace_name: file.workspace_name
                            })
                          }}
                        />
                      )}
                      <IconButton
                        codicon_icon="go-to-file"
                        title="Go To File"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_go_to_file({
                            file_path: file.file_path,
                            workspace_name: file.workspace_name
                          })
                        }}
                      />
                    </div>
                    {!file.is_deleted && (
                      <div className={styles['list__file__line-numbers']}>
                        <span
                          className={styles['list__file__line-numbers__added']}
                        >
                          +{file.lines_added}
                        </span>
                        <span
                          className={
                            styles['list__file__line-numbers__removed']
                          }
                        >
                          -{file.lines_removed}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            } else {
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

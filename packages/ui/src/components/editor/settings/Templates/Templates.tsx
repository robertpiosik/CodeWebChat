import { ReactSortable } from 'react-sortablejs'
import styles from './Templates.module.scss'
import cn from 'classnames'
import { IconButton } from '../../common/IconButton'
import { useState } from 'react'

export namespace Templates {
  export type Template = {
    name?: string
    template: string
  }

  export type Props = {
    templates: Record<string, Template[]>
    on_reorder: (key: string, templates: Template[]) => void
    on_delete: (key: string, index: number) => void
    on_edit: (key: string, index: number) => void
    on_add: (key: string, params?: { insertion_index?: number }) => void
    translations: {
      item_text: string
      items_text: string
      items_text_many: string
      types: Record<string, string>
      expand: string
      collapse: string
      add_new: string
    }
  }
}

export const Templates: React.FC<Templates.Props> = (props) => {
  const [expanded_keys, set_expanded_keys] = useState<Record<string, boolean>>(
    {}
  )

  const toggle_expanded = (key: string) => {
    set_expanded_keys((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const render_header = (count: number, key: string, is_top: boolean) => (
    <div className={styles.header}>
      <div className={styles['header__left']}>
        <div className={styles['header__left__amount']}>
          {count}{' '}
          {(() => {
            if (count === 1) return props.translations.item_text

            const last_digit = count % 10
            const last_two_digits = count % 100
            const is_few =
              last_digit >= 2 &&
              last_digit <= 4 &&
              (last_two_digits < 12 || last_two_digits > 14)
            return is_few
              ? props.translations.items_text
              : props.translations.items_text_many
          })()}
        </div>
      </div>
      <IconButton
        codicon_icon="add"
        title={props.translations.add_new}
        on_click={(e) => {
          e.stopPropagation()
          props.on_add(key)
        }}
      />
    </div>
  )

  return (
    <div className={styles.groups}>
      {Object.entries(props.templates).map(([key, templates]) => {
        const sortable_items = templates.map((t, index) => ({
          id: `${index}-${t.name}-${t.template}`,
          original_index: index,
          ...t
        }))
        const is_expanded = !!expanded_keys[key]

        return (
          <div
            key={key}
            className={cn(styles.group, {
              [styles['group--expanded']]: is_expanded,
              [styles['group--hoverable']]: !is_expanded
            })}
          >
            <div
              className={styles.group__header}
              onClick={() => toggle_expanded(key)}
            >
              <div className={styles.group__title}>
                {props.translations.types[key] || key}
              </div>
              <IconButton
                codicon_icon={is_expanded ? 'chevron-up' : 'chevron-down'}
                title={
                  is_expanded
                    ? props.translations.collapse
                    : props.translations.expand
                }
                on_click={(e) => {
                  e.stopPropagation()
                  toggle_expanded(key)
                }}
              />
            </div>

            {is_expanded && (
              <div className={styles.group__content}>
                <div className={styles.container}>
                  {render_header(sortable_items.length, key, true)}
                  {sortable_items.length > 0 && (
                    <>
                      <div className={styles.list}>
                        <ReactSortable
                          list={sortable_items}
                          setList={(new_list) => {
                            const has_order_changed =
                              new_list.length != sortable_items.length ||
                              new_list.some(
                                (item, index) =>
                                  item.id != sortable_items[index].id
                              )

                            if (has_order_changed) {
                              props.on_reorder(
                                key,
                                new_list.map((i) => ({
                                  name: i.name,
                                  template: i.template
                                }))
                              )
                            }
                          }}
                          tag="div"
                          animation={150}
                        >
                          {sortable_items.map((item, index) => (
                            <div key={item.id} className={styles.row}>
                              <div
                                className={cn(
                                  styles['drag-handle'],
                                  styles['col-drag']
                                )}
                              >
                                <span className="codicon codicon-gripper" />
                              </div>
                              <div className={styles.row__content}>
                                <div className={styles['item-text']}>
                                  <span>{item.name || 'Unnamed'}</span>
                                </div>
                              </div>
                              <div className={styles['col-actions']}>
                                <IconButton
                                  codicon_icon="insert"
                                  title="Insert"
                                  on_click={(e) => {
                                    e.stopPropagation()
                                    props.on_add(key, {
                                      insertion_index: index
                                    })
                                  }}
                                />
                                <IconButton
                                  codicon_icon="edit"
                                  title="Edit"
                                  on_click={(e) => {
                                    e.stopPropagation()
                                    props.on_edit?.(key, item.original_index)
                                  }}
                                />
                                <IconButton
                                  codicon_icon="trash"
                                  title="Delete"
                                  on_click={(e) => {
                                    e.stopPropagation()
                                    props.on_delete(key, item.original_index)
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </ReactSortable>
                      </div>
                      {render_header(sortable_items.length, key, false)}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

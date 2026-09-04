import styles from './Templates.module.scss'
import cn from 'classnames'
import { IconButton } from '../../common/IconButton'
import { useState } from 'react'
import { SortableList } from '../SortableList'

export namespace Templates {
  export type Template = {
    name?: string
    template: string
  }

  export type Props = {
    templates: {
      key: string
      label: string
      icon?: string
      accent_color?: 'blue' | 'orange' | 'red' | 'green'
      items: Template[]
    }[]
    on_reorder: (key: string, templates: Template[]) => void
    on_delete: (key: string, index: number) => void
    on_edit: (key: string, index: number) => void
    on_add: (
      key: string,
      params?: { insertion_index?: number; exact_insertion?: boolean }
    ) => void
    translations: {
      item_text: string
      items_text: string
      items_text_many: string
      expand: string
      collapse: string
      add_new: string
    }
  }
}

export const Templates: React.FC<Templates.Props> = (props) => {
  const [expanded_keys, set_expanded_keys] = useState<string[]>([])

  const toggle_expanded = (key: string) => {
    set_expanded_keys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  return (
    <div className={styles.container}>
      {props.templates.map(({ key, label, icon, accent_color, items }) => {
        const is_expanded = expanded_keys.includes(key)
        const sortable_items = items.map((t, index) => ({
          id: `${index}-${t.name}-${t.template}`,
          original_index: index,
          ...t
        }))

        return (
          <div
            key={key}
            className={cn(styles.group, {
              [styles['group--expanded']]: is_expanded,
              [styles['group--hoverable']]: !is_expanded,
              [styles[`group--accent-${accent_color}`]]:
                accent_color && is_expanded
            })}
          >
            <div
              className={styles.group__header}
              onClick={() => toggle_expanded(key)}
            >
              <div className={styles.group__title}>
                {icon && (
                  <span
                    className={cn(
                      'codicon',
                      `codicon-${icon}`,
                      styles.group__icon
                    )}
                  />
                )}
                <span className={styles.group__label}>{label}</span>
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
                <SortableList
                  items={sortable_items}
                  on_reorder={(new_list) => {
                    props.on_reorder(
                      key,
                      new_list.map((i) => ({
                        name: i.name,
                        template: i.template
                      }))
                    )
                  }}
                  on_add={(params) => props.on_add(key, params)}
                  translations={{
                    add_title: props.translations.add_new,
                    item_text: props.translations.item_text,
                    items_text: props.translations.items_text,
                    items_text_many: props.translations.items_text_many
                  }}
                  render_content={(item) => (
                    <div className={styles['item-text']}>
                      <span>{item.name || 'Unnamed'}</span>
                    </div>
                  )}
                  render_actions={(item, index) => (
                    <>
                      <IconButton
                        codicon_icon="insert"
                        title="Insert"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_add(key, { insertion_index: index })
                        }}
                      />
                      <IconButton
                        codicon_icon="edit"
                        title="Edit"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_edit(key, item.original_index)
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
                    </>
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

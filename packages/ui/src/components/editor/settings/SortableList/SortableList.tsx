import styles from './SortableList.module.scss'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { IconButton } from '../../common/IconButton'

export namespace SortableList {
  export type Item = {
    id: string
  }

  export type Translations = {
    add_title: string
    insert_title: string
    item_text: string
    items_text: string
    items_text_many?: string
  }

  export type Props<T extends Item> = {
    items: T[]
    on_reorder: (items: T[]) => void
    on_add: (params?: {
      insertion_index?: number
      create_on_top?: boolean
    }) => void
    render_content: (item: T, index: number) => React.ReactNode
    render_actions?: (item: T, index: number) => React.ReactNode
    header_extra?: React.ReactNode
    translations: Translations
  }
}

export function SortableList<T extends SortableList.Item>(
  props: SortableList.Props<T>
) {
  const render_item = (item: T, index: number) => (
    <div key={item.id} className={styles.row}>
      <div className={cn(styles['drag-handle'], styles['col-drag'])}>
        <span className="codicon codicon-gripper" />
      </div>
      <div className={styles.row__content}>
        {props.render_content(item, index)}
      </div>
      <div className={styles['col-actions']}>
        <IconButton
          codicon_icon="insert"
          title={props.translations.insert_title}
          on_click={() => props.on_add({ insertion_index: index })}
        />
        {props.render_actions?.(item, index)}
      </div>
    </div>
  )

  const render_header = (is_top: boolean) => (
    <div className={styles.header}>
      <div className={styles['header__left']}>
        <div className={styles['header__left__amount']}>
          {props.items.length}{' '}
          {(() => {
            const count = props.items.length
            if (count == 1) return props.translations.item_text

            if (props.translations.items_text_many) {
              const last_digit = count % 10
              const last_two_digits = count % 100
              const is_few =
                last_digit >= 2 &&
                last_digit <= 4 &&
                (last_two_digits < 12 || last_two_digits > 14)
              return is_few
                ? props.translations.items_text
                : props.translations.items_text_many
            }
            return props.translations.items_text
          })()}
        </div>
        {props.header_extra}
      </div>
      <IconButton
        codicon_icon="add"
        title={props.translations.add_title}
        on_click={() =>
          props.on_add(is_top ? { create_on_top: true } : undefined)
        }
      />
    </div>
  )

  return (
    <div className={styles.container}>
      {render_header(true)}
      {props.items.length > 0 && (
        <div className={styles.list}>
          <ReactSortable
            list={props.items}
            setList={(new_list) => {
              const has_order_changed =
                new_list.length != props.items.length ||
                new_list.some((item, index) => item.id != props.items[index].id)

              if (has_order_changed) {
                props.on_reorder(new_list)
              }
            }}
            tag="div"
            animation={150}
          >
            {props.items.map((item, index) => render_item(item, index))}
          </ReactSortable>
        </div>
      )}
      {props.items.length > 0 && render_header(false)}
    </div>
  )
}

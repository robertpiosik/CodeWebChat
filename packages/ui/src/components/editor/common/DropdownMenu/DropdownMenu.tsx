import styles from './DropdownMenu.module.scss'
import cn from 'classnames'

export namespace DropdownMenu {
  export type Item = {
    label: string
    shortcut?: string
    on_click: () => void
    is_selected?: boolean
  }

  export type Props = {
    items: Item[]
    on_mouse_enter?: React.MouseEventHandler<HTMLDivElement>
  }
}

export const DropdownMenu: React.FC<DropdownMenu.Props> = ({
  items,
  on_mouse_enter
}) => {
  return (
    <div className={cn(styles.menu)} onMouseEnter={on_mouse_enter}>
      {items.map((item, index) => (
        <div
          key={index}
          className={styles.item}
          onClick={item.on_click}
          data-selected={item.is_selected}
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className={styles.shortcut}>{item.shortcut}</span>
          )}
        </div>
      ))}
    </div>
  )
}

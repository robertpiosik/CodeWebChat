import styles from './DropdownMenu.module.scss'
import cn from 'classnames'

export namespace DropdownMenu {
  export type Item = {
    label: string
    shortcut?: string
    on_click: () => void
  }

  export type Props = {
    items: Item[]
    className?: string
  }
}

export const DropdownMenu: React.FC<DropdownMenu.Props> = ({
  items,
  className
}) => {
  return (
    <div className={cn(styles.menu, className)}>
      {items.map((item, index) => (
        <div key={index} className={styles.item} onClick={item.on_click}>
          <span>{item.label}</span>
          {item.shortcut && (
            <span className={styles.shortcut}>{item.shortcut}</span>
          )}
        </div>
      ))}
    </div>
  )
}

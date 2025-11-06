import { useState } from 'react'
import styles from './DropdownMenu.module.scss'

export namespace DropdownMenu {
  export type Item = {
    label: string
    shortcut?: string
    on_click: () => void
    is_selected?: boolean
  }

  export type Props = {
    items: Item[]
  }
}

export const DropdownMenu: React.FC<DropdownMenu.Props> = (props) => {
  const [is_preselection_respected, set_is_preselection_respected] =
    useState<boolean>(true)

  return (
    <div className={styles.menu}>
      {props.items.map((item, index) => (
        <div
          key={index}
          className={styles.item}
          onClick={item.on_click}
          data-selected={item.is_selected && is_preselection_respected}
          onMouseEnter={() => {
            set_is_preselection_respected(false)
          }}
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

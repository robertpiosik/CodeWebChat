import { useState } from 'react'
import styles from './DropdownMenu.module.scss'

export namespace DropdownMenu {
  export type Item = {
    label: string
    shortcut?: string
    on_click: () => void
    checked?: boolean
    is_selected?: boolean
  }

  export type Props = {
    items: Item[]
    underline_non_selected_items?: boolean
    max_width?: number | string
  }
}

export const DropdownMenu: React.FC<DropdownMenu.Props> = (props) => {
  const [is_preselection_respected, set_is_preselection_respected] =
    useState<boolean>(true)

  const has_any_checked = props.items.some((item) => item.checked)

  return (
    <div className={styles.menu} style={{ maxWidth: props.max_width }}>
      <div className={styles.menu__inner}>
        {props.items.map((item, index) => {
          const is_selected = item.is_selected && is_preselection_respected
          const should_underline =
            props.underline_non_selected_items && !is_selected

          return (
            <div
              key={index}
              className={styles.item}
              onClick={item.on_click}
              data-selected={is_selected}
              onMouseEnter={() => {
                set_is_preselection_respected(false)
              }}
            >
              <div className={styles.item__left}>
                {has_any_checked && (
                  <span
                    className="codicon codicon-check"
                    style={{ visibility: item.checked ? 'visible' : 'hidden' }}
                  />
                )}
                <span className={styles.item__label}>
                  {should_underline ? (
                    <>
                      <span className={styles.underlined}>
                        {item.label.substring(0, 1)}
                      </span>
                      {item.label.substring(1)}
                    </>
                  ) : (
                    item.label
                  )}
                </span>
              </div>
              {item.shortcut && (
                <div className={styles.item__right}>
                  <span className={styles.shortcut}>{item.shortcut}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

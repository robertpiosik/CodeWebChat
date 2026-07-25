import { useState, useLayoutEffect, useRef } from 'react'
import { Scrollable } from '../Scrollable'
import styles from './DropdownMenu.module.scss'

export namespace DropdownMenu {
  export type Item = {
    label: string
    shortcut?: string
    on_click: () => void
    is_checked?: boolean
    is_active?: boolean
  }

  export type Props = {
    items: Item[]
    underline_non_selected_items?: boolean
    max_width?: number | string
    max_height?: number | string
    width?: number | string
    min_width?: number | string
    info?: string
    anchor_ref?: React.RefObject<HTMLElement>
    is_open?: boolean
    match_anchor_width?: boolean
  }
}

export const DropdownMenu: React.FC<DropdownMenu.Props> = (props) => {
  const dropdown_ref = useRef<HTMLDivElement>(null)
  const [anchor_style, set_anchor_style] = useState<React.CSSProperties>({})

  useLayoutEffect(() => {
    if (props.is_open && props.anchor_ref?.current && dropdown_ref.current) {
      const anchor_rect = props.anchor_ref.current.getBoundingClientRect()
      const dropdown_rect = dropdown_ref.current.getBoundingClientRect()

      let top = anchor_rect.bottom
      const actual_dropdown_width = Math.max(
        dropdown_rect.width,
        anchor_rect.width
      )

      let left = props.match_anchor_width
        ? anchor_rect.left
        : anchor_rect.right - actual_dropdown_width
      let width: string | undefined

      if (props.match_anchor_width) {
        width = `${anchor_rect.width}px`
      } else if (left < 0) {
        left = 4
      } else if (left + actual_dropdown_width > window.innerWidth) {
        left = window.innerWidth - actual_dropdown_width - 4
      }

      const viewport_height = window.innerHeight
      if (top + dropdown_rect.height > viewport_height - 4) {
        const overflow = top + dropdown_rect.height - (viewport_height - 4)
        top -= overflow
      }

      set_anchor_style({
        top: `${top}px`,
        left: `${left}px`,
        width,
        minWidth: `${anchor_rect.width}px`
      })
    } else if (!props.is_open) {
      set_anchor_style({})
    }
  }, [props.is_open, props.match_anchor_width, props.items])

  if (props.anchor_ref && !props.is_open) return null

  const has_any_checked = props.items.some((item) => item.is_checked)

  const content = (
    <div className={styles.content}>
      {props.info && <div className={styles.header}>{props.info}</div>}
      {props.items.map((item, index) => {
        return (
          <div
            key={index}
            className={styles.item}
            onClick={item.on_click}
            data-active={item.is_active}
          >
            <div className={styles.item__left}>
              {has_any_checked && (
                <span
                  className="codicon codicon-check"
                  style={{ visibility: item.is_checked ? 'visible' : 'hidden' }}
                />
              )}
              <span>
                {props.underline_non_selected_items ? (
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
  )

  const menu = (
    <div
      className={styles.menu}
      style={{
        maxWidth: props.max_width,
        width: props.width,
        minWidth: props.min_width
      }}
    >
      <div className={styles.menu__inner}>
        {props.max_height ? (
          <Scrollable
            top_shadow
            bottom_shadow
            max_height={
              typeof props.max_height == 'number'
                ? `${props.max_height}px`
                : props.max_height
            }
          >
            {content}
          </Scrollable>
        ) : (
          content
        )}
      </div>
    </div>
  )

  if (props.anchor_ref) {
    return (
      <div ref={dropdown_ref} style={anchor_style} className={styles.anchored}>
        {menu}
      </div>
    )
  }

  return menu
}

import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './PromptTypeDropdown.module.scss'
import cn from 'classnames'
import { DropdownMenu } from '../../common/DropdownMenu'
import { use_click_outside } from '../../../../hooks/use-click-outside'

export namespace PromptTypeDropdown {
  export type Option<T extends string> = {
    value: T
    label: string
    shortcut?: string
  }

  export type Props<T extends string> = {
    options: Option<T>[]
    selected_value: T
    on_change: (value: T) => void
    on_alternate_click?: () => void
    max_width?: number
    menu_max_width?: number | string
    menu_max_height?: number | string
    info?: string
    title?: string
    match_button_width?: boolean
  }
}

export const PromptTypeDropdown = <T extends string>(
  props: PromptTypeDropdown.Props<T>
) => {
  const [is_open, set_is_open] = useState(false)
  const [just_opened, set_just_opened] = useState(false)
  const [is_rotating, set_is_rotating] = useState(false)
  const container_ref = useRef<HTMLDivElement>(null)
  const opened_by_shortcut = useRef(false)

  const selected_option = props.options.find(
    (option) => option.value == props.selected_value
  )

  const handle_toggle = () => {
    opened_by_shortcut.current = false
    set_is_open(!is_open)
    set_just_opened(!is_open)
  }

  const handle_select = (value: T) => {
    props.on_change(value)
    opened_by_shortcut.current = false
    set_is_open(false)
    set_just_opened(false)
  }

  use_click_outside(
    container_ref,
    useCallback(() => {
      opened_by_shortcut.current = false
      set_is_open(false)
      set_just_opened(false)
    }, [])
  )

  useEffect(() => {
    set_is_open(false)
    set_just_opened(false)
    opened_by_shortcut.current = false
  }, [props.selected_value])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && !is_open) {
        event.preventDefault()
        set_is_open(true)
        set_just_opened(true)
        opened_by_shortcut.current = true
      }
    }

    const handle_key_up = (event: KeyboardEvent) => {
      if (
        opened_by_shortcut.current &&
        (event.key == 'Alt' || event.key == 'Shift')
      ) {
        set_is_open(false)
        set_just_opened(false)
        opened_by_shortcut.current = false
      }
    }

    document.addEventListener('keydown', handle_key_down)
    document.addEventListener('keyup', handle_key_up)

    return () => {
      document.removeEventListener('keydown', handle_key_down)
      document.removeEventListener('keyup', handle_key_up)
    }
  }, [is_open])

  return (
    <div
      className={cn(styles.container, { [styles['button--open']]: is_open })}
      ref={container_ref}
    >
      <div
        className={cn(styles.button, { [styles['button--open']]: is_open })}
        style={{ maxWidth: props.max_width }}
        title={props.title}
      >
        {props.on_alternate_click && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (props.on_alternate_click) {
                  set_is_rotating(true)
                  props.on_alternate_click()
                }
              }}
              className={cn(styles.button__alternate, {
                [styles['button__alternate--rotating']]: is_rotating
              })}
              title="Toggle previous prompt type"
              onAnimationEnd={() => set_is_rotating(false)}
            >
              <span className={cn('codicon', 'codicon-sync')} />
            </button>
            <div className={styles.button__separator} />
          </>
        )}
        <div
          className={styles.button__trigger}
          onClick={handle_toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handle_toggle()
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span className={styles.button__label}>
            {selected_option ? selected_option.label : 'Select an option'}
          </span>
          {is_open ? (
            <span
              className={cn(
                'codicon',
                'codicon-chevron-up',
                styles.button__icon
              )}
            />
          ) : (
            <span
              className={cn(
                'codicon',
                'codicon-chevron-down',
                styles.button__icon
              )}
            />
          )}
        </div>
      </div>

      <DropdownMenu
        anchor_ref={container_ref}
        is_open={is_open}
        match_anchor_width={props.match_button_width}
        items={props.options.map((option) => ({
          label: option.label,
          on_click: () => handle_select(option.value),
          is_selected: just_opened && option.value == props.selected_value,
          is_active: option.value == props.selected_value,
          shortcut: option.shortcut
        }))}
        underline_non_selected_items={opened_by_shortcut.current}
        max_width={props.menu_max_width}
        max_height={props.menu_max_height}
        width={props.match_button_width ? '100%' : undefined}
        min_width={props.match_button_width ? 0 : undefined}
        info={props.info}
      />
    </div>
  )
}

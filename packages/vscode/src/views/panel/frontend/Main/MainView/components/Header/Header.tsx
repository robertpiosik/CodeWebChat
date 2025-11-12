import { useState, useEffect, useRef } from 'react'
import cn from 'classnames'
import {
  MAIN_VIEW_TYPES,
  MainViewType
} from '@/views/panel/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { Dropdown as UiDropdown } from '@ui/components/editor/panel/Dropdown'
import { IconButton as UiIconButton } from '@ui/components/editor/panel/IconButton'
import styles from './Header.module.scss'
import { api_mode_labels, web_mode_labels } from '../../modes'

type Props = {
  main_view_type: MainViewType
  on_main_view_type_change: (value: MainViewType) => void
  on_show_home: () => void
  web_mode: WebMode
  api_mode: ApiMode
  on_web_mode_change: (mode: WebMode) => void
  on_api_mode_change: (mode: ApiMode) => void
  on_quick_action_click: (command: string) => void
}

export const Header: React.FC<Props> = (props) => {
  const [dropdown_max_width, set_dropdown_max_width] = useState<
    number | undefined
  >(undefined)
  const header_ref = useRef<HTMLDivElement>(null)
  const header_left_ref = useRef<HTMLDivElement>(null)

  const handle_heading_click = () => {
    if (props.main_view_type == MAIN_VIEW_TYPES.WEB) {
      props.on_main_view_type_change(MAIN_VIEW_TYPES.API)
    } else {
      props.on_main_view_type_change(MAIN_VIEW_TYPES.WEB)
    }
  }

  const calculate_dropdown_max_width = () => {
    if (!header_ref.current || !header_left_ref.current) return

    const header_width = header_ref.current.offsetWidth
    const header_left_width = header_left_ref.current.offsetWidth
    // header_width - left_width - (header padding) 24 - (gap between left/right) 12 - (gap in right) 8 - (settings button) 20
    const calculated_width = header_width - header_left_width - 64
    set_dropdown_max_width(calculated_width)
  }

  useEffect(() => {
    if (!header_ref.current || !header_left_ref.current) return

    const resize_observer = new ResizeObserver(() => {
      calculate_dropdown_max_width()
    })

    resize_observer.observe(header_ref.current)
    resize_observer.observe(header_left_ref.current)

    calculate_dropdown_max_width()

    return () => {
      resize_observer.disconnect()
    }
  }, [])

  return (
    <div className={styles.header} ref={header_ref}>
      <div className={styles.header__left} ref={header_left_ref}>
        <UiIconButton
          codicon_icon="chevron-left"
          on_click={props.on_show_home}
          title="Return"
        />
        <button
          className={styles['header__left__toggler']}
          onClick={handle_heading_click}
          title="Change view"
        >
          {props.main_view_type == MAIN_VIEW_TYPES.WEB
            ? 'New chat'
            : 'API call'}
        </button>
      </div>

      <div className={styles.header__right}>
        <div className={styles.header__right__dropdown}>
          {props.main_view_type == MAIN_VIEW_TYPES.WEB && (
            <UiDropdown
              options={Object.entries(web_mode_labels).map(
                ([value, label]) => ({ value: value as WebMode, label })
              )}
              selected_value={props.web_mode}
              on_change={props.on_web_mode_change}
              max_width={dropdown_max_width}
              info="prompt type"
            />
          )}
          {props.main_view_type == MAIN_VIEW_TYPES.API && (
            <UiDropdown
              options={Object.entries(api_mode_labels).map(
                ([value, label]) => ({ value: value as ApiMode, label })
              )}
              selected_value={props.api_mode}
              on_change={props.on_api_mode_change}
              max_width={dropdown_max_width}
              info="prompt type"
            />
          )}
        </div>

        <button
          className={styles['header__right__settings']}
          onClick={() => props.on_quick_action_click('codeWebChat.settings')}
          title="Settings"
        >
          <span className={cn('codicon', 'codicon-settings-gear')} />
        </button>
      </div>
    </div>
  )
}

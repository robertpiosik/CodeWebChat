import { useState, useEffect, useRef, useCallback } from 'react'
import cn from 'classnames'
import { MODE, Mode } from '@/views/panel/types/home-view-type'
import { use_is_narrow_viewport, use_is_mac } from '@shared/hooks'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { Dropdown as UiDropdown } from '@ui/components/editor/panel/Dropdown'
import { IconButton as UiIconButton } from '@ui/components/editor/panel/IconButton'
import styles from './Header.module.scss'
import { api_mode_labels, web_mode_labels } from '../../modes'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'

type Props = {
  mode: Mode
  on_mode_change: (value: Mode) => void
  on_show_home: () => void
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_web_prompt_type_change: (mode: WebPromptType) => void
  on_api_prompt_type_change: (mode: ApiPromptType) => void
  on_quick_action_click: (command: string) => void
}

export const Header: React.FC<Props> = (props) => {
  const [dropdown_max_width, set_dropdown_max_width] = useState<
    number | undefined
  >(undefined)
  const header_ref = useRef<HTMLDivElement>(null)
  const is_narrow_viewport = use_is_narrow_viewport(294)
  const is_mac = use_is_mac()
  const header_left_ref = useRef<HTMLDivElement>(null)

  const handle_heading_click = useCallback(() => {
    if (props.mode == MODE.WEB) {
      props.on_mode_change(MODE.API)
    } else {
      props.on_mode_change(MODE.WEB)
    }
  }, [props.mode, props.on_mode_change])

  use_keyboard_shortcuts({
    mode: props.mode,
    handle_heading_click,
    on_web_prompt_type_change: props.on_web_prompt_type_change,
    on_api_prompt_type_change: props.on_api_prompt_type_change,
  })

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
          title={`Change mode (${is_mac ? '⌘+Esc' : 'Ctrl+Esc'})`}
        >
          {props.mode == MODE.WEB ? MODE.WEB : MODE.API}
        </button>
      </div>

      <div className={styles.header__right}>
        <div className={styles.header__right__dropdown}>
          {props.mode == MODE.WEB && (
            <UiDropdown
              options={Object.entries(web_mode_labels).map(
                ([value, label]) => ({ value: value as WebPromptType, label })
              )}
              selected_value={props.web_prompt_type}
              on_change={props.on_web_prompt_type_change}
              max_width={dropdown_max_width}
              info={is_narrow_viewport ? undefined : 'prompt type'}
              title="Change prompt type (Shift+Alt)"
            />
          )}
          {props.mode == MODE.API && (
            <UiDropdown
              options={Object.entries(api_mode_labels).map(
                ([value, label]) => ({ value: value as ApiPromptType, label })
              )}
              selected_value={props.api_prompt_type}
              on_change={props.on_api_prompt_type_change}
              max_width={dropdown_max_width}
              info={is_narrow_viewport ? undefined : 'prompt type'}
              title="Change prompt type (Shift+Alt)"
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

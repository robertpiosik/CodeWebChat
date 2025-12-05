import { useRef, useCallback } from 'react'
import cn from 'classnames'
import { MODE, Mode } from '@/views/panel/types/main-view-mode'
import { use_is_narrow_viewport, use_is_mac } from '@shared/hooks'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { Dropdown as UiDropdown } from '@ui/components/editor/panel/Dropdown'
import { IconButton as UiIconButton } from '@ui/components/editor/panel/IconButton'
import styles from './Header.module.scss'
import { api_mode_labels, web_mode_labels } from '../../modes'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'
import { use_translation } from '@/views/panel/frontend/hooks/use-translation'

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
  const { t } = use_translation()
  const header_ref = useRef<HTMLDivElement>(null)
  const is_narrow_viewport = use_is_narrow_viewport(294)
  const is_mac = use_is_mac()
  const header_left_ref = useRef<HTMLDivElement>(null)
  const dropdown_container_ref = useRef<HTMLDivElement>(null)

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
    on_show_home: props.on_show_home
  })

  return (
    <div className={styles.header} ref={header_ref}>
      <div className={styles.header__left} ref={header_left_ref}>
        <UiIconButton
          codicon_icon="chevron-left"
          on_click={props.on_show_home}
          title="Return (Esc)"
        />
        <button
          className={styles['header__left__toggler']}
          onClick={handle_heading_click}
          title={`Change mode (${is_mac ? '⌘Esc' : 'Ctrl+Esc'})`}
        >
          {props.mode == MODE.WEB ? MODE.WEB : MODE.API}
        </button>
      </div>

      <div className={styles.header__right}>
        <div
          className={styles.header__right__dropdown}
          ref={dropdown_container_ref}
        >
          {props.mode == MODE.WEB && (
            <UiDropdown
              options={Object.entries(web_mode_labels).map(
                ([value, label]) => ({
                  value: value as WebPromptType,
                  label,
                  shortcut: `${is_mac ? '⇧⌥' : 'Shift+Alt+'}${label.charAt(0)}`
                })
              )}
              selected_value={props.web_prompt_type}
              on_change={props.on_web_prompt_type_change}
              menu_max_width="calc(100vw - 52px)"
              info={
                is_narrow_viewport ? undefined : t('panel.header.prompt-type')
              }
              title={
                is_mac
                  ? 'Change prompt type (⇧⌥)'
                  : 'Change prompt type (Shift+Alt)'
              }
            />
          )}
          {props.mode == MODE.API && (
            <UiDropdown
              options={Object.entries(api_mode_labels).map(
                ([value, label]) => ({
                  value: value as ApiPromptType,
                  label,
                  shortcut: `${is_mac ? '⇧⌥' : 'Shift+Alt+'}${label.charAt(0)}`
                })
              )}
              selected_value={props.api_prompt_type}
              on_change={props.on_api_prompt_type_change}
              menu_max_width="calc(100vw - 60px)"
              info={
                is_narrow_viewport ? undefined : t('panel.header.prompt-type')
              }
              title={
                is_mac
                  ? 'Change prompt type (⇧⌥)'
                  : 'Change prompt type (Shift+Alt)'
              }
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

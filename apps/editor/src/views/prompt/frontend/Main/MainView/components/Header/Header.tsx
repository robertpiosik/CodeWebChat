import { useCallback, useState } from 'react'
import { MODE, Mode } from '@/views/prompt/types/main-view-mode'
import { use_compacting, use_is_mac } from '@shared/hooks'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { PromptTypeButton as UiPromptTypeButton } from '@ui/components/editor/prompt/PromptTypeButton'
import { IconButton as UiIconButton } from '@ui/components/editor/common/IconButton'
import styles from './Header.module.scss'
import {
  api_prompt_type_labels,
  web_prompt_type_labels
} from '../../prompt-type-labels'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'
import { use_translation } from '@/views/prompt/frontend/i18n/use-translation'

type Props = {
  mode: Mode
  on_mode_change: (value: Mode) => void
  on_show_home: () => void
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  are_keyboard_shortcuts_disabled: boolean
}

export const Header: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const is_mac = use_is_mac()
  const { container_ref, compact_step } = use_compacting()

  const [is_hovered, set_is_hovered] = useState(false)
  const [just_clicked, set_just_clicked] = useState(false)

  const handle_mouse_enter = useCallback(() => {
    set_is_hovered(true)
    set_just_clicked(false)
  }, [])

  const handle_mouse_leave = useCallback(() => {
    set_is_hovered(false)
    set_just_clicked(false)
  }, [])

  const handle_heading_click = useCallback(() => {
    set_just_clicked(true)
    if (props.mode == MODE.WEB) {
      props.on_mode_change(MODE.API)
    } else {
      props.on_mode_change(MODE.WEB)
    }
  }, [props.mode, props.on_mode_change])

  const { is_alt_pressed } = use_keyboard_shortcuts({
    mode: props.mode,
    handle_heading_click,
    on_web_prompt_type_change: props.on_web_prompt_type_change,
    on_api_prompt_type_change: props.on_api_prompt_type_change,
    on_show_home: props.on_show_home,
    is_disabled: props.are_keyboard_shortcuts_disabled
  })

  return (
    <div className={styles.header} ref={container_ref}>
      <div className={styles.header__left}>
        <UiIconButton
          codicon_icon="chevron-left"
          on_click={props.on_show_home}
          title={`${t('header.return')} (Esc)`}
        />
        {props.mode == MODE.WEB && (
          <div className={styles['header__left__prompt-types']}>
            <UiPromptTypeButton
              label={web_prompt_type_labels['edit-files']}
              icon="edit-sparkle"
              is_active={props.web_prompt_type == 'edit-files'}
              is_compact={
                props.web_prompt_type == 'edit-files'
                  ? compact_step >= 2
                  : compact_step >= 1
              }
              keycap_char={is_alt_pressed ? 'E' : undefined}
              on_click={() => props.on_web_prompt_type_change('edit-files')}
            />
            <UiPromptTypeButton
              label={web_prompt_type_labels['ask-about-files']}
              icon="chat-sparkle"
              is_active={props.web_prompt_type == 'ask-about-files'}
              is_compact={
                props.web_prompt_type == 'ask-about-files'
                  ? compact_step >= 2
                  : compact_step >= 1
              }
              keycap_char={is_alt_pressed ? 'A' : undefined}
              on_click={() =>
                props.on_web_prompt_type_change('ask-about-files')
              }
            />
          </div>
        )}
        {props.mode == MODE.API && (
          <div className={styles['header__left__prompt-types']}>
            <UiPromptTypeButton
              label={api_prompt_type_labels['edit-files']}
              icon="edit-sparkle"
              is_active={props.api_prompt_type == 'edit-files'}
              is_compact={compact_step >= 1}
              on_click={() => props.on_api_prompt_type_change('edit-files')}
            />
          </div>
        )}
      </div>

      <div className={styles.header__right}>
        <button
          className={styles['header__right__toggler']}
          onClick={handle_heading_click}
          onMouseEnter={handle_mouse_enter}
          onMouseLeave={handle_mouse_leave}
          title={`${t('header.change-mode')} (${is_mac ? '⌥Esc' : 'Alt+Esc'})`}
        >
          <div
            className={`${styles['header__right__toggler__wrapper']} ${
              is_hovered && !just_clicked
                ? styles['header__right__toggler__wrapper--hover']
                : ''
            } ${
              just_clicked
                ? styles['header__right__toggler__wrapper--no-transition']
                : ''
            }`}
          >
            <span className={styles['header__right__toggler__label']}>
              {props.mode == MODE.WEB ? MODE.WEB : MODE.API}
            </span>
            <span className={styles['header__right__toggler__label']}>
              {props.mode == MODE.WEB ? MODE.API : MODE.WEB}
            </span>
          </div>
          {is_alt_pressed && (
            <span className={styles['header__right__toggler__esc']}>esc</span>
          )}
        </button>
      </div>
    </div>
  )
}

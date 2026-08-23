import { useCallback } from 'react'
import { MODE, Mode } from '@/views/prompt/types/main-view-mode'
import { use_compacting, use_is_mac } from '@shared/hooks'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { PromptTypeButton as UiPromptTypeButton } from '@ui/components/editor/prompt/PromptTypeButton'
import { ModeToggler } from '@ui/components/editor/prompt/ModeToggler'
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

  const handle_heading_click = useCallback(() => {
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
          <>
            <UiPromptTypeButton
              label={web_prompt_type_labels['edit-files']}
              icon="edit-sparkle"
              is_active={props.web_prompt_type == 'edit-files'}
              active_color="blue"
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
              active_color="orange"
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
          </>
        )}
        {props.mode == MODE.API && (
          <UiPromptTypeButton
            label={api_prompt_type_labels['edit-files']}
            icon="edit-sparkle"
            is_active={props.api_prompt_type == 'edit-files'}
            active_color="blue"
            is_compact={compact_step >= 1}
            on_click={() => props.on_api_prompt_type_change('edit-files')}
          />
        )}
      </div>

      <div className={styles.header__right}>
        <ModeToggler
          mode={props.mode == MODE.WEB ? MODE.WEB : MODE.API}
          alt_mode={props.mode == MODE.WEB ? MODE.API : MODE.WEB}
          title={`${t('header.change-mode')} (${is_mac ? '⌥Esc' : 'Alt+Esc'})`}
          is_alt_pressed={is_alt_pressed}
          on_toggle={handle_heading_click}
        />
      </div>
    </div>
  )
}

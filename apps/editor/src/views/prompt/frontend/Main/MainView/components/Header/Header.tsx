import { MODE, Mode } from '@/views/prompt/types/main-view-mode'
import { use_compacting } from '@shared/hooks'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { PromptTypeButton as UiPromptTypeButton } from '@ui/components/editor/prompt/PromptTypeButton'
import { KeycapWrapper as UiKeycapWrapper } from '@ui/components/editor/prompt/KeycapWrapper'
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
  on_mode_change: (mode: Mode) => void
  on_show_home: () => void
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  are_keyboard_shortcuts_disabled: boolean
}

export const Header: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const { container_ref, compact_step } = use_compacting()

  const { is_alt_pressed } = use_keyboard_shortcuts({
    mode: props.mode,
    on_mode_change: props.on_mode_change,
    on_web_prompt_type_change: props.on_web_prompt_type_change,
    on_api_prompt_type_change: props.on_api_prompt_type_change,
    on_show_home: props.on_show_home,
    is_disabled: props.are_keyboard_shortcuts_disabled
  })

  return (
    <div className={styles.header} ref={container_ref}>
      <div className={styles.header__left}>
        <UiKeycapWrapper
          char={
            is_alt_pressed ? (props.mode == MODE.API ? '1' : '2') : undefined
          }
        >
          <UiIconButton
            codicon_icon="chevron-left"
            on_click={props.on_show_home}
            title={`${t('header.return')} (Esc)`}
          />
        </UiKeycapWrapper>
        {props.mode == MODE.WEB && (
          <>
            <UiKeycapWrapper char={is_alt_pressed ? 'E' : undefined}>
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
                on_click={() => props.on_web_prompt_type_change('edit-files')}
              />
            </UiKeycapWrapper>
            <UiKeycapWrapper char={is_alt_pressed ? 'A' : undefined}>
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
                on_click={() =>
                  props.on_web_prompt_type_change('ask-about-files')
                }
              />
            </UiKeycapWrapper>
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
    </div>
  )
}

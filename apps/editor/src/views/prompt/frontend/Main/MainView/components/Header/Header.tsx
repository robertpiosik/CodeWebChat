import { TARGET, Target } from '@shared/types/mode'
import { use_compacting } from '@shared/hooks'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { IconAccentButton as UiIconAccentButton } from '@ui/components/editor/prompt/IconAccentButton'
import { KeycapWrapper as UiKeycapWrapper } from '@ui/components/editor/prompt/KeycapWrapper'
import { IconButton as UiIconButton } from '@ui/components/editor/common/IconButton'
import styles from './Header.module.scss'
import {
  api_prompt_type_labels,
  web_prompt_type_labels
} from '../../prompt-type-labels'
import { use_translation } from '@/views/prompt/frontend/i18n/use-translation'
import { StatusBar as UiStatusBar } from '@ui/components/editor/prompt/StatusBar'
import { Spacer as UiSpacer } from '@ui/components/editor/prompt/Spacer'
import { Responses as UiResponses } from '@ui/components/editor/prompt/Responses'
import { ResponseHistoryItem } from '@shared/types/response-history-item'

type Props = {
  target: Target
  on_show_home: () => void
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  is_alt_pressed: boolean
  is_landscape: boolean
  is_browser_connection_status_bar_closed: boolean
  is_content_scrollable: boolean
  is_api_warning_visible: boolean
  response_history: ResponseHistoryItem[]
}

export const Header: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const { container_ref, compact_step } = use_compacting({
    is_disabled: props.is_landscape
  })

  return (
    <div
      className={styles.header}
      ref={container_ref}
      data-is-content-scrollable={props.is_content_scrollable}
    >
      <div className={styles.header__left}>
        <div className={styles.header__back}>
          <UiIconButton
            codicon_icon="chevron-left"
            on_click={props.on_show_home}
            title={`${t('header.return')} (Esc)`}
          />
        </div>

        <div className={styles.header__types}>
          {props.is_landscape &&
            props.target == TARGET.WEB &&
            (!props.is_browser_connection_status_bar_closed ||
              (props.response_history.length > 0 &&
                props.web_prompt_type === 'edit-files')) &&
            !props.is_content_scrollable && (
              <>
                <div
                  style={{
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    width: 0
                  }}
                >
                  {!props.is_browser_connection_status_bar_closed && (
                    <>
                      <UiStatusBar
                        icon="codicon-debug-disconnect"
                        label=""
                        actions={[
                          {
                            id: 'install',
                            icon: 'codicon-add',
                            label: '',
                            title: '',
                            on_click: () => {}
                          }
                        ]}
                      />
                      <UiSpacer height={6} />
                    </>
                  )}
                  {props.response_history.length > 0 &&
                    props.web_prompt_type === 'edit-files' && (
                      <UiResponses
                        response_history={props.response_history}
                        on_response_history_item_click={() => {}}
                        on_selected_history_item_change={() => {}}
                        on_response_history_item_remove={() => {}}
                        translations={{
                          applied_manually: '',
                          reject: ''
                        }}
                      />
                    )}
                </div>
              </>
            )}
          {props.is_landscape &&
            props.target == TARGET.API &&
            (props.is_api_warning_visible ||
              (props.response_history.length > 0 &&
                props.api_prompt_type === 'edit-files')) &&
            !props.is_content_scrollable && (
              <>
                <div
                  style={{
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    width: 0
                  }}
                >
                  {props.is_api_warning_visible && (
                    <>
                      <UiStatusBar
                        icon="codicon-warning"
                        label=""
                        actions={[
                          {
                            id: 'settings',
                            icon: 'codicon-gear',
                            label: '',
                            title: '',
                            on_click: () => {}
                          }
                        ]}
                      />
                      <UiSpacer height={6} />
                    </>
                  )}
                  {props.response_history.length > 0 &&
                    props.api_prompt_type === 'edit-files' && (
                      <UiResponses
                        response_history={props.response_history}
                        on_response_history_item_click={() => {}}
                        on_selected_history_item_change={() => {}}
                        on_response_history_item_remove={() => {}}
                        translations={{
                          applied_manually: '',
                          reject: ''
                        }}
                      />
                    )}
                </div>
              </>
            )}
          {props.target == TARGET.WEB && (
            <>
              <div className={styles.header__types__inner}>
                <UiKeycapWrapper char={props.is_alt_pressed ? 'E' : undefined}>
                  <UiIconAccentButton
                    label={web_prompt_type_labels['edit-files']}
                    icon="edit-sparkle"
                    is_active={props.web_prompt_type == 'edit-files'}
                    active_color="blue"
                    is_compact={
                      !props.is_landscape &&
                      (props.web_prompt_type == 'edit-files'
                        ? compact_step >= 2
                        : compact_step >= 1)
                    }
                    on_click={() =>
                      props.on_web_prompt_type_change('edit-files')
                    }
                  />
                </UiKeycapWrapper>
                <UiKeycapWrapper char={props.is_alt_pressed ? 'A' : undefined}>
                  <UiIconAccentButton
                    label={web_prompt_type_labels['ask-about-files']}
                    icon="chat-sparkle"
                    is_active={props.web_prompt_type == 'ask-about-files'}
                    active_color="purple"
                    is_compact={
                      !props.is_landscape &&
                      (props.web_prompt_type == 'ask-about-files'
                        ? compact_step >= 2
                        : compact_step >= 1)
                    }
                    on_click={() =>
                      props.on_web_prompt_type_change('ask-about-files')
                    }
                  />
                </UiKeycapWrapper>
              </div>
            </>
          )}
          {props.target == TARGET.API && (
            <>
              <UiIconAccentButton
                label={api_prompt_type_labels['edit-files']}
                icon="edit-sparkle"
                is_active={props.api_prompt_type == 'edit-files'}
                active_color="blue"
                is_compact={!props.is_landscape && compact_step >= 1}
                on_click={() => props.on_api_prompt_type_change('edit-files')}
              />
            </>
          )}
          {props.is_landscape && (
            <div
              style={{
                visibility: 'hidden',
                pointerEvents: 'none',
                width: 0
              }}
            >
              <UiStatusBar
                icon="codicon-debug-disconnect"
                label=""
                actions={[
                  {
                    id: 'install',
                    icon: 'codicon-add',
                    label: '',
                    title: '',
                    on_click: () => {}
                  }
                ]}
              />
            </div>
          )}
        </div>

        {props.is_landscape && (
          <div
            style={{
              visibility: 'hidden',
              pointerEvents: 'none'
            }}
          >
            <UiIconButton codicon_icon="chevron-left" />
          </div>
        )}
      </div>
    </div>
  )
}

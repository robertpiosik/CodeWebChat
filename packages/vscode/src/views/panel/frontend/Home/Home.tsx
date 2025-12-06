import styles from './Home.module.scss'
import { Scrollable } from '@ui/components/editor/panel/Scrollable'
import { Timeline } from '@ui/components/editor/panel/Timeline'
import { ModeButton } from '@ui/components/editor/panel/ModeButton'
import cn from 'classnames'
import { post_message } from '../utils/post_message'
import { Checkpoint, FrontendMessage } from '@/views/panel/types/messages'
import { Responses as UiResponses } from '@ui/components/editor/panel/Responses'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { Separator } from '@ui/components/editor/panel/Separator'
import { ListHeader } from '@ui/components/editor/panel/ListHeader'
import { use_translation } from '@/views/i18n/use-translation'
import { useState } from 'react'
import { IconButton } from '@ui/components/editor/panel/IconButton'

type Props = {
  vscode: any
  is_active: boolean
  on_chatbots_click: () => void
  on_api_calls_click: () => void
  version: string
  checkpoints: Checkpoint[]
  on_toggle_checkpoint_starred: (timestamp: number) => void
  on_restore_checkpoint: (timestamp: number) => void
  response_history: ResponseHistoryItem[]
  on_response_history_item_click: (item: ResponseHistoryItem) => void
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
  on_response_history_item_remove: (created_at: number) => void
}

export const Home: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [is_timeline_collapsed, set_is_timeline_collapsed] = useState(false)

  const handle_settings_click = () => {
    post_message(props.vscode, {
      command: 'EXECUTE_COMMAND',
      command_id: 'codeWebChat.settings'
    } as FrontendMessage)
  }

  const handle_create_checkpoint_click = () => {
    post_message(props.vscode, {
      command: 'CREATE_CHECKPOINT'
    } as FrontendMessage)
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles['header__left']}>
          <div className={styles['header__home']}>
            <span className="codicon codicon-home" />
          </div>
          <span className={styles['header__text']}>Home</span>
        </div>
        <button
          className={styles['header__settings']}
          onClick={handle_settings_click}
          title={t('panel.header.settings')}
        >
          <span>{t('panel.header.settings')}</span>
          <span className={styles['header__settings__icon-wrapper']}>
            <span className={cn('codicon', 'codicon-settings-gear')} />
          </span>
        </button>
      </div>

      <Scrollable>
        <div className={styles.content}>
          <div className={styles.inner}>
            {props.response_history.length > 0 && (
              <div className={styles.inner__responses}>
                <UiResponses
                  response_history={props.response_history}
                  on_response_history_item_click={
                    props.on_response_history_item_click
                  }
                  selected_history_item_created_at={
                    props.selected_history_item_created_at
                  }
                  on_selected_history_item_change={
                    props.on_selected_history_item_change
                  }
                  on_response_history_item_remove={
                    props.on_response_history_item_remove
                  }
                />{' '}
              </div>
            )}

            <div className={styles.inner__mode}>
              <ModeButton
                pre="Initialize"
                label="Chatbots"
                on_click={props.on_chatbots_click}
              />
              <ModeButton
                pre="Make"
                label="API calls"
                on_click={props.on_api_calls_click}
              />
            </div>
            <Separator height={8} />
            <ListHeader
              title="Timeline"
              is_collapsed={is_timeline_collapsed}
              on_toggle_collapsed={() =>
                set_is_timeline_collapsed(!is_timeline_collapsed)
              }
              actions={
                <IconButton
                  codicon_icon="add"
                  title="New checkpoint"
                  on_click={(e) => {
                    e.stopPropagation()
                    handle_create_checkpoint_click()
                  }}
                />
              }
            />
            {!is_timeline_collapsed && (
              <Timeline
                items={props.checkpoints.map((c) => ({
                  id: c.timestamp,
                  label: c.title,
                  timestamp: c.timestamp,
                  description: c.description,
                  is_starred: c.is_starred
                }))}
                on_toggle_starred={(id) =>
                  props.on_toggle_checkpoint_starred(id)
                }
                on_item_click={(id) => props.on_restore_checkpoint(id)}
              />
            )}
          </div>

          <div className={styles.bottom}>
            <div className={styles.bottom__links}>
              <div>{props.version}</div>
              <div>
                Released under the{' '}
                <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE">
                  GPL-3.0 license
                </a>
              </div>
              <div>
                Copyright © {new Date().getFullYear()}{' '}
                <a href="https://x.com/robertpiosik">Robert Piosik</a>
              </div>
            </div>
          </div>
        </div>
      </Scrollable>
    </>
  )
}

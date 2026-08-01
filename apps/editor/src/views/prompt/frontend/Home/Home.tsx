import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import styles from './Home.module.scss'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Tabs as UiTabs } from '@ui/components/editor/prompt/Tabs'
import { ModeButton as UiModeButton } from '@ui/components/editor/prompt/ModeButton'
import cn from 'classnames'
import { post_message } from '../utils/post-message'
import { BackendMessage } from '@/views/prompt/types/messages'
import { Responses as UiResponses } from '@ui/components/editor/prompt/Responses'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { Separator as UiSeparator } from '@ui/components/editor/prompt/Separator'
import { Translation, use_translation } from '../i18n/use-translation'
import { IconButton as UiIconButton } from '@ui/components/editor/common/IconButton'
import { CompactableActionButton } from '@ui/components/editor/prompt/CompactableActionButton'
import { Tasks as UiTasks } from '@ui/components/editor/prompt/Tasks'
import { use_tasks } from './hooks/use-tasks'
import { use_sticky_mode } from './hooks/use-sticky-mode'
import { use_compacting } from '@shared/hooks'

type Props = {
  vscode: any
  is_active: boolean
  on_go_forward: () => void
  on_chatbots_click: () => void
  on_api_calls_click: () => void
  version: string
  response_history: ResponseHistoryItem[]
  on_response_history_item_click: (item: ResponseHistoryItem) => void
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
  on_response_history_item_remove: (created_at: number) => void
  on_task_forward: (text: string) => void
  is_setup_complete: boolean
  is_connected: boolean
  on_donate_click: () => void
  bottom_spacer_height?: number
}

export const Home: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [active_workspace_root, set_active_workspace_root] = useState<string>()
  const {
    is_mode_sticky,
    is_hiding,
    is_animating_in,
    responses_ref,
    mode_ref,
    handle_scroll
  } = use_sticky_mode(props.is_active)

  const {
    tasks,
    handle_reorder,
    handle_change,
    handle_add,
    handle_add_subtask,
    handle_delete
  } = use_tasks(props.vscode)

  const roots = Object.keys(tasks)
  const active_root =
    active_workspace_root && roots.includes(active_workspace_root)
      ? active_workspace_root
      : roots[0]

  const { container_ref, compact_step, report_width } = use_compacting(2)
  const left_ref = useRef<HTMLDivElement>(null)
  const right_ref = useRef<HTMLDivElement>(null)

  const discord_label = 'Discord'
  const coffee_label = t('header.buy-me-a-coffee')

  useLayoutEffect(() => {
    if (left_ref.current && right_ref.current) {
      const width =
        left_ref.current.getBoundingClientRect().width +
        right_ref.current.getBoundingClientRect().width +
        8
      report_width(width, compact_step)
    }
  }, [compact_step, report_width])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'TASKS_WORKSPACE_PICKED') {
        set_active_workspace_root(message.root)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  useEffect(() => {
    const handle_mouse_up = (event: MouseEvent) => {
      if (props.is_active && event.button == 4) {
        props.on_go_forward()
      }
    }

    window.addEventListener('mouseup', handle_mouse_up)
    return () => window.removeEventListener('mouseup', handle_mouse_up)
  }, [props.is_active, props.on_go_forward])

  return (
    <>
      <div className={styles.header} ref={container_ref}>
        <div className={styles['header__left']} ref={left_ref}>
          <div className={styles['header__home']}>
            <span className="codicon codicon-home" />
          </div>
          <span className={styles['header__text']}>CWC</span>
        </div>
        <div className={styles['header__right']} ref={right_ref}>
          <CompactableActionButton
            label={discord_label}
            href="https://discord.gg/KJySXsrSX5"
            icon="DISCORD"
            is_compact={compact_step >= 1}
          />
          <CompactableActionButton
            label={coffee_label}
            on_click={props.on_donate_click}
            codicon="coffee"
            is_compact={compact_step >= 2}
          />
        </div>
      </div>

      <UiScrollable on_scroll={handle_scroll} top_shadow>
        <div
          className={cn(styles.content, {
            [styles['content--sticky']]: is_mode_sticky
          })}
        >
          <div className={styles.inner}>
            {props.response_history.length > 0 && (
              <div className={styles.inner__responses} ref={responses_ref}>
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
                />
              </div>
            )}

            <div
              className={cn(styles.inner__mode, {
                [styles['inner__mode--sticky']]: is_mode_sticky,
                [styles['inner__mode--animating-in']]: is_animating_in,
                [styles['inner__mode--hiding']]: is_hiding
              })}
              ref={mode_ref}
            >
              <UiModeButton
                pre={props.is_connected ? 'Autofill' : 'Copy for'}
                label="Chatbots"
                on_click={props.on_chatbots_click}
                is_compact={is_mode_sticky}
              />
              <UiModeButton
                pre="Make"
                label="API calls"
                on_click={props.on_api_calls_click}
                is_compact={is_mode_sticky}
              />
            </div>

            <UiSeparator height={8} />

            <UiTabs
              tabs={[{ id: 'tasks', label: t('home.tasks') }]}
              active_tab="tasks"
              on_tab_change={() => {}}
              actions={
                <>
                  {roots.length > 1 && (
                    <div className={styles['inner__workspace-dropdown']}>
                      <div
                        className={styles['inner__workspace-dropdown-button']}
                        onClick={(e) => {
                          e.stopPropagation()
                          post_message(props.vscode, {
                            command: 'PICK_TASKS_WORKSPACE',
                            roots,
                            active_root
                          })
                        }}
                        title={t('home.folder')}
                      >
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {active_root?.split(/[\\/]/).pop() || active_root}
                        </span>
                        <span
                          className="codicon codicon-unfold"
                          style={{ fontSize: '12px', flexShrink: 0 }}
                        />
                      </div>
                    </div>
                  )}
                  {roots.length > 0 && (
                    <UiIconButton
                      codicon_icon="add"
                      title={t('home.tasks.add')}
                      on_click={(e) => {
                        e.stopPropagation()
                        if (active_root) {
                          handle_add(active_root, tasks[active_root], 'top')
                        }
                      }}
                    />
                  )}
                </>
              }
            />

            {roots.length == 0 && (
              <div className={styles.inner__empty}>{t('home.tasks.empty')}</div>
            )}
            {active_root && (
              <div className={styles.inner__tasks}>
                {tasks[active_root].length == 0 ? (
                  <div className={styles.inner__empty}>
                    {t('home.tasks.empty')}
                  </div>
                ) : (
                  <UiTasks
                    tasks={tasks[active_root]}
                    on_reorder={(new_tasks) =>
                      handle_reorder(active_root, new_tasks)
                    }
                    on_change={(updated_task) => {
                      handle_change(
                        active_root,
                        tasks[active_root],
                        updated_task
                      )
                    }}
                    on_add={() => {
                      handle_add(active_root, tasks[active_root])
                    }}
                    on_add_subtask={(parent_task) => {
                      handle_add_subtask(
                        active_root,
                        tasks[active_root],
                        parent_task
                      )
                    }}
                    on_delete={(timestamp) => {
                      handle_delete(active_root, timestamp)
                    }}
                    on_forward={(text) => {
                      props.on_task_forward(text)
                    }}
                    placeholder={t('home.tasks.placeholder')}
                  />
                )}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%'
            }}
          >
            <div className={styles.bottom}>
              <div className={styles.bottom__links}>
                <div>{props.version}</div>
                <div>
                  <Translation
                    id="home.footer.copyright"
                    components={{
                      year: new Date().getFullYear().toString(),
                      link: (
                        <a href="https://x.com/robertpiosik">Robert Piosik</a>
                      )
                    }}
                  />
                </div>
              </div>
            </div>
            {props.bottom_spacer_height !== undefined &&
              props.bottom_spacer_height > 0 && (
                <div
                  style={{ height: props.bottom_spacer_height, flexShrink: 0 }}
                />
              )}
          </div>
        </div>
      </UiScrollable>
    </>
  )
}

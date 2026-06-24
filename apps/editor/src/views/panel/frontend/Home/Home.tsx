import { useState, useEffect } from 'react'
import styles from './Home.module.scss'
import { Scrollable as UiScrollable } from '@ui/components/editor/panel/Scrollable'
import { Checkpoints as UiCheckpoints } from '@ui/components/editor/panel/Checkpoints'
import { ModeButton as UiModeButton } from '@ui/components/editor/panel/ModeButton'
import cn from 'classnames'
import { post_message } from '../utils/post-message'
import { Checkpoint, FrontendMessage } from '@/views/panel/types/messages'
import { Responses as UiResponses } from '@ui/components/editor/panel/Responses'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { Separator as UiSeparator } from '@ui/components/editor/panel/Separator'
import { Tabs as UiTabs } from '@ui/components/editor/panel/Tabs'
import { Translation, use_translation } from '../i18n/use-translation'
import { IconButton as UiIconButton } from '@ui/components/editor/common/IconButton'
import { Tasks as UiTasks } from '@ui/components/editor/panel/Tasks'
import { Task } from '@shared/types/task'
import { use_tasks } from './hooks/use-tasks'
import { use_sticky_mode } from './hooks/use-sticky-mode'
import { SettingsButton as UiSettingsButton } from '@ui/components/editor/panel/SettingsButton'
import { InlineDropdown as UiInlineDropdown } from '@ui/components/editor/panel/InlineDropdown'

type Props = {
  vscode: any
  is_active: boolean
  on_go_forward: () => void
  on_chatbots_click: () => void
  on_api_calls_click: () => void
  version: string
  checkpoints: Checkpoint[]
  has_temp_checkpoint: boolean
  on_restore_temp_checkpoint: () => void
  on_toggle_checkpoint_starred: (timestamp: number) => void
  on_restore_checkpoint: (timestamp: number) => void
  response_history: ResponseHistoryItem[]
  on_response_history_item_click: (item: ResponseHistoryItem) => void
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
  on_response_history_item_remove: (created_at: number) => void
  on_edit_checkpoint_description: (timestamp: number) => void
  on_delete_checkpoint: (timestamp: number) => void
  tasks: Record<string, Task[]>
  on_tasks_change: (root: string, tasks: Task[]) => void
  on_task_delete: (root: string, timestamp: number) => void
  on_task_forward: (text: string) => void
  is_setup_complete: boolean
  is_connected: boolean
}

export const Home: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [active_tab, set_active_tab] = useState<'tasks' | 'checkpoints'>(
    'tasks'
  )
  const [active_workspace_root, set_active_workspace_root] = useState<string>()
  const {
    is_mode_sticky,
    is_hiding,
    is_animating_in,
    responses_ref,
    mode_ref,
    handle_scroll
  } = use_sticky_mode(props.is_active)

  const roots = Object.keys(props.tasks)
  const active_root =
    active_workspace_root && roots.includes(active_workspace_root)
      ? active_workspace_root
      : roots[0]

  useEffect(() => {
    const handle_mouse_up = (event: MouseEvent) => {
      if (props.is_active && event.button == 4) {
        props.on_go_forward()
      }
    }

    window.addEventListener('mouseup', handle_mouse_up)
    return () => window.removeEventListener('mouseup', handle_mouse_up)
  }, [props.is_active, props.on_go_forward])

  const {
    handle_reorder,
    handle_change,
    handle_add,
    handle_add_subtask,
    handle_delete
  } = use_tasks(props.on_tasks_change, props.on_task_delete)

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

  const handle_delete_all_checkpoints_click = () => {
    post_message(props.vscode, {
      command: 'CLEAR_ALL_CHECKPOINTS'
    } as FrontendMessage)
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles['header__left']}>
          <div className={styles['header__home']}>
            <span className="codicon codicon-home" />
          </div>
          <span className={styles['header__text']}>{t('header.home')}</span>
        </div>
        <UiSettingsButton
          on_click={handle_settings_click}
          label={t('header.settings')}
          show_warning_icon={!props.is_setup_complete}
        />
      </div>

      <UiScrollable on_scroll={handle_scroll}>
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
              tabs={[
                { id: 'tasks', label: t('home.tasks') },
                { id: 'checkpoints', label: t('home.checkpoints') }
              ]}
              active_tab={active_tab}
              on_tab_change={(id) =>
                set_active_tab(id as 'tasks' | 'checkpoints')
              }
              actions={
                active_tab == 'tasks' ? (
                  <>
                    {roots.length > 1 && (
                      <div className={styles['inner__workspace-dropdown']}>
                        <UiInlineDropdown
                          options={roots.map((root) => ({
                            value: root,
                            label: root.split(/[\\/]/).pop() || root
                          }))}
                          selected_value={active_root!}
                          on_change={(val) => set_active_workspace_root(val)}
                          info={t('home.folder')}
                        />
                      </div>
                    )}
                    {roots.length > 0 && (
                      <UiIconButton
                        codicon_icon="add"
                        title={t('home.tasks.add')}
                        on_click={(e) => {
                          e.stopPropagation()
                          if (active_root) {
                            handle_add(
                              active_root,
                              props.tasks[active_root],
                              'top'
                            )
                          }
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {props.has_temp_checkpoint && (
                      <UiIconButton
                        codicon_icon="discard"
                        title={t('command.checkpoints.revert-last')}
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_restore_temp_checkpoint()
                        }}
                      />
                    )}
                    <UiIconButton
                      codicon_icon="add"
                      title={t('home.checkpoints.new-checkpoint')}
                      on_click={(e) => {
                        e.stopPropagation()
                        handle_create_checkpoint_click()
                      }}
                    />
                    {props.checkpoints.length > 0 && (
                      <UiIconButton
                        codicon_icon="trash"
                        title={t('home.checkpoints.delete-all')}
                        on_click={(e) => {
                          e.stopPropagation()
                          handle_delete_all_checkpoints_click()
                        }}
                      />
                    )}
                  </>
                )
              }
            />

            {active_tab == 'tasks' && (
              <>
                {roots.length == 0 && (
                  <div className={styles.inner__empty}>
                    {t('home.tasks.empty')}
                  </div>
                )}
                {active_root && (
                  <div className={styles.inner__tasks}>
                    {props.tasks[active_root].length == 0 ? (
                      <div className={styles.inner__empty}>
                        {t('home.tasks.empty')}
                      </div>
                    ) : (
                      <UiTasks
                        tasks={props.tasks[active_root]}
                        on_reorder={(new_tasks) =>
                          handle_reorder(active_root, new_tasks)
                        }
                        on_change={(updated_task) => {
                          handle_change(
                            active_root,
                            props.tasks[active_root],
                            updated_task
                          )
                        }}
                        on_add={() => {
                          handle_add(active_root, props.tasks[active_root])
                        }}
                        on_add_subtask={(parent_task) => {
                          handle_add_subtask(
                            active_root,
                            props.tasks[active_root],
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
              </>
            )}

            {active_tab == 'checkpoints' && (
              <>
                {props.checkpoints.length > 0 ? (
                  <UiCheckpoints
                    items={props.checkpoints.map((c) => ({
                      id: c.timestamp,
                      label: t(
                        `command.checkpoints.trigger.${c.trigger}` as any
                      ),
                      timestamp: c.timestamp,
                      description: c.description,
                      is_starred: c.is_starred,
                      can_edit: c.trigger == 'manual'
                    }))}
                    on_toggle_starred={(id) =>
                      props.on_toggle_checkpoint_starred(id)
                    }
                    on_item_click={(id) => props.on_restore_checkpoint(id)}
                    on_edit={props.on_edit_checkpoint_description}
                    on_delete={props.on_delete_checkpoint}
                  />
                ) : (
                  <div className={styles.inner__empty}>
                    {t('home.checkpoints.empty')}
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.bottom}>
            <div className={styles.bottom__links}>
              <div>{props.version}</div>
              <div>
                <Translation
                  id="home.footer.copyright"
                  components={{
                    year: new Date().getFullYear().toString(),
                    link: <a href="https://x.com/robertpiosik">Robert Piosik</a>
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </UiScrollable>
    </>
  )
}

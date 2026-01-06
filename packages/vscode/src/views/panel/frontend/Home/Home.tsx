import { useState, useRef } from 'react'
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
import { IconButton } from '@ui/components/editor/panel/IconButton'
import { Tasks } from '@ui/components/editor/panel/Tasks'
import { Task } from '@shared/types/task'
import { use_tasks } from './hooks/use-tasks'

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
  on_edit_checkpoint_description: (timestamp: number) => void
  on_delete_checkpoint: (timestamp: number) => void
  is_timeline_collapsed: boolean
  on_timeline_collapsed_change: (is_collapsed: boolean) => void
  are_tasks_collapsed: boolean
  on_tasks_collapsed_change: (is_collapsed: boolean) => void
  tasks: Record<string, Task[]>
  on_tasks_change: (root: string, tasks: Task[]) => void
  on_task_delete: (root: string, timestamp: number) => void
  on_task_copy: (text: string) => void
}

export const Home: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const [is_mode_sticky, set_is_mode_sticky] = useState(false)
  const responses_ref = useRef<HTMLDivElement>(null)
  const mode_ref = useRef<HTMLDivElement>(null)

  const {
    handle_reorder,
    handle_change,
    handle_add,
    handle_add_subtask,
    handle_delete,
    handle_copy
  } = use_tasks(props.on_tasks_change, props.on_task_delete, props.on_task_copy)

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

      <Scrollable
        on_scroll={(top) => {
          const responses_height = responses_ref.current?.clientHeight || 0
          const mode_height = mode_ref.current?.clientHeight || 0
          set_is_mode_sticky(top > responses_height + mode_height + 4)
        }}
      >
        <div className={styles.content}>
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
                [styles['inner__mode--sticky']]: is_mode_sticky
              })}
              ref={mode_ref}
            >
              <ModeButton
                pre="Autofill"
                label="Chatbots"
                on_click={props.on_chatbots_click}
                is_compact={is_mode_sticky}
              />
              <ModeButton
                pre="Make"
                label="API calls"
                on_click={props.on_api_calls_click}
                is_compact={is_mode_sticky}
              />
            </div>

            <Separator height={8} />

            <ListHeader
              title="Tasks"
              is_collapsed={props.are_tasks_collapsed}
              on_toggle_collapsed={() =>
                props.on_tasks_collapsed_change(!props.are_tasks_collapsed)
              }
              actions={
                Object.keys(props.tasks).length == 1 ? (
                  <IconButton
                    codicon_icon="add"
                    title="Add Task"
                    on_click={(e) => {
                      e.stopPropagation()
                      const roots = Object.keys(props.tasks)
                      if (roots.length > 0) {
                        handle_add(roots[0], props.tasks[roots[0]], 'top')
                        if (props.are_tasks_collapsed) {
                          props.on_tasks_collapsed_change(false)
                        }
                      }
                    }}
                  />
                ) : undefined
              }
            />
            {!props.are_tasks_collapsed &&
              Object.entries(props.tasks)
                .filter(([_, tasks], __, arr) =>
                  arr.length == 1 ? tasks.length : true
                )
                .map(([workspace_root_folder, tasks], _, entries) => (
                  <div
                    key={workspace_root_folder}
                    className={styles.inner__tasks}
                  >
                    {entries.length > 1 && (
                      <div className={styles['inner__tasks-header']}>
                        <span>
                          {workspace_root_folder.split(/[\\/]/).pop() ||
                            workspace_root_folder}
                        </span>
                        <button
                          className={styles['add-button']}
                          title="Add Task"
                          onClick={() => {
                            handle_add(workspace_root_folder, tasks, 'top')
                          }}
                        />
                      </div>
                    )}
                    {tasks.length > 0 && (
                      <Tasks
                        tasks={tasks}
                        on_reorder={(new_tasks) =>
                          handle_reorder(workspace_root_folder, new_tasks)
                        }
                        on_change={(updated_task) => {
                          handle_change(
                            workspace_root_folder,
                            tasks,
                            updated_task
                          )
                        }}
                        on_add={() => {
                          handle_add(workspace_root_folder, tasks)
                        }}
                        on_add_subtask={(parent_task) => {
                          handle_add_subtask(
                            workspace_root_folder,
                            tasks,
                            parent_task
                          )
                        }}
                        on_delete={(timestamp) => {
                          handle_delete(workspace_root_folder, timestamp)
                        }}
                        on_copy={(text) => {
                          handle_copy(text)
                        }}
                      />
                    )}
                  </div>
                ))}

            <ListHeader
              title="Timeline"
              is_collapsed={props.is_timeline_collapsed}
              on_toggle_collapsed={() =>
                props.on_timeline_collapsed_change(!props.is_timeline_collapsed)
              }
              actions={
                <>
                  <IconButton
                    codicon_icon="add"
                    title="New Checkpoint"
                    on_click={(e) => {
                      e.stopPropagation()
                      handle_create_checkpoint_click()
                    }}
                  />
                  {props.checkpoints.length > 0 && (
                    <IconButton
                      codicon_icon="trash"
                      title="Delete all checkpoints"
                      on_click={(e) => {
                        e.stopPropagation()
                        handle_delete_all_checkpoints_click()
                      }}
                    />
                  )}
                </>
              }
            />
            {!props.is_timeline_collapsed &&
              (props.checkpoints.length > 0 ? (
                <Timeline
                  items={props.checkpoints.map((c) => ({
                    id: c.timestamp,
                    label: c.title,
                    timestamp: c.timestamp,
                    description: c.description,
                    is_starred: c.is_starred,
                    can_edit: c.title == 'Created by user'
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
                  No checkpoints created yet.
                </div>
              ))}
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

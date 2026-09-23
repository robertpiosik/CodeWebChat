import { useState, useEffect, useRef } from 'react'
import styles from './Home.module.scss'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Tabs as UiTabs } from '@ui/components/editor/prompt/Tabs'
import { TargetButton as UiTargetButton } from '@ui/components/editor/prompt/TargetButton'
import cn from 'classnames'
import { post_message } from '../utils/post-message'
import { BackendMessage } from '@/views/prompt/types/messages'
import { Spacer as UiSpacer } from '@ui/components/editor/prompt/Spacer'
import { Translation, use_translation } from '../i18n/use-translation'
import { CompactableActionButton } from '@ui/components/editor/prompt/CompactableActionButton'
import { Tasks as UiTasks } from '@ui/components/editor/prompt/Tasks'
import { use_tasks } from './hooks/use-tasks'
import { use_has_scrolled_past_target_button } from './hooks/use-has-scrolled-past-mode-button'
import { use_compacting } from '@shared/hooks'
import { TARGET } from '@shared/types/mode'
import {
  ApiPromptType,
  WebPromptType,
  CliPromptType
} from '@shared/types/prompt-types'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'
import { use_is_landscape } from '../hooks/use-is-landscape'

type Props = {
  vscode: any
  is_active: boolean
  on_go_forward: () => void
  on_chatbots_click: () => void
  on_api_calls_click: () => void
  on_cli_calls_click: () => void
  version: string
  is_setup_complete: boolean
  is_connected: boolean
  on_donate_click: () => void
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  cli_prompt_type: CliPromptType
}

export const Home: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const is_landscape = use_is_landscape()
  const [active_workspace_root, set_active_workspace_root] = useState<string>()
  const { has_scrolled_past_target_button, target_ref, handle_scroll } =
    use_has_scrolled_past_target_button(props.is_active)

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
      : roots[0] || active_workspace_root || ''

  const { container_ref, compact_step } = use_compacting({
    is_disabled: is_landscape
  })

  const header_targets_ref = useRef<HTMLDivElement>(null)

  const [is_alt_pressed, set_is_alt_pressed] = useState(false)
  const alt_interrupted_ref = useRef(false)

  const discord_label = 'Discord'
  const coffee_label = t('header.buy-me-a-coffee')

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
    const handle_key_down = (event: KeyboardEvent) => {
      if (
        event.key == 'Alt' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        if (!alt_interrupted_ref.current) {
          set_is_alt_pressed(true)
        }
      } else {
        if (event.altKey) {
          alt_interrupted_ref.current = true
        }
        set_is_alt_pressed(false)
      }
    }

    const handle_key_up = (event: KeyboardEvent) => {
      if (!event.altKey) {
        alt_interrupted_ref.current = false
      } else if (event.key != 'Alt') {
        alt_interrupted_ref.current = true
      }
      set_is_alt_pressed(
        event.altKey &&
          !alt_interrupted_ref.current &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.metaKey
      )
    }

    const handle_blur = () => {
      set_is_alt_pressed(false)
      alt_interrupted_ref.current = false
    }

    window.addEventListener('keydown', handle_key_down)
    window.addEventListener('keyup', handle_key_up)
    window.addEventListener('blur', handle_blur)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
      window.removeEventListener('keyup', handle_key_up)
      window.removeEventListener('blur', handle_blur)
    }
  }, [])

  use_keyboard_shortcuts({
    is_active: props.is_active,
    on_go_forward: props.on_go_forward,
    on_chatbots_click: props.on_chatbots_click,
    on_api_calls_click: props.on_api_calls_click,
    on_cli_calls_click: props.on_cli_calls_click
  })

  const header = (
    <div className={styles.header}>
      <div
        className={cn(styles.header__normal, {
          [styles['header__normal--hidden']]: has_scrolled_past_target_button
        })}
        ref={container_ref}
      >
        <div className={styles.header__icon}>
          <span className="codicon codicon-home" />
        </div>
        <div className={styles.header__links}>
          <CompactableActionButton
            label={discord_label}
            href="https://discord.gg/KJySXsrSX5"
            icon="DISCORD"
            is_compact={is_landscape || compact_step >= 1}
          />
          <CompactableActionButton
            label={coffee_label}
            on_click={props.on_donate_click}
            codicon="coffee"
            is_compact={is_landscape || compact_step >= 2}
          />
          {is_landscape && (
            <div
              style={{
                visibility: 'hidden',
                pointerEvents: 'none'
              }}
            >
              <div className={styles.header__icon}>
                <span className="codicon codicon-home" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={header_targets_ref}
        className={cn(styles.header__targets, {
          [styles['header__targets--visible']]: has_scrolled_past_target_button
        })}
      >
        <UiTargetButton
          label={TARGET.WEB}
          on_click={props.on_chatbots_click}
          is_compact
          hover_color={
            props.web_prompt_type == 'edit-files' ? 'blue' : 'purple'
          }
          keycap_char={is_alt_pressed ? 'W' : undefined}
        />
        <UiTargetButton
          label={TARGET.API}
          on_click={props.on_api_calls_click}
          is_compact
          hover_color={
            props.api_prompt_type == 'edit-files' ? 'blue' : 'purple'
          }
          keycap_char={is_alt_pressed ? 'A' : undefined}
        />
        <UiTargetButton
          label={TARGET.CLI}
          on_click={props.on_cli_calls_click}
          is_compact
          hover_color={
            props.cli_prompt_type == 'edit-files' ? 'blue' : 'purple'
          }
          keycap_char={is_alt_pressed ? 'C' : undefined}
        />
      </div>
    </div>
  )

  const targets_section = (
    <div className={styles.inner__target} ref={target_ref}>
      <UiTargetButton
        label={TARGET.WEB}
        description={
          props.is_connected
            ? t('home.target.web.description-connected')
            : t('home.target.web.description')
        }
        on_click={props.on_chatbots_click}
        hover_color={props.web_prompt_type == 'edit-files' ? 'blue' : 'purple'}
        keycap_char={is_alt_pressed ? 'W' : undefined}
      />
      <UiTargetButton
        label={TARGET.API}
        description={t('home.target.api.description')}
        on_click={props.on_api_calls_click}
        hover_color={props.api_prompt_type == 'edit-files' ? 'blue' : 'purple'}
        keycap_char={is_alt_pressed ? 'A' : undefined}
      />
      <UiTargetButton
        label={TARGET.CLI}
        description={t('home.target.cli.description')}
        on_click={props.on_cli_calls_click}
        hover_color={props.cli_prompt_type == 'edit-files' ? 'blue' : 'purple'}
        keycap_char={is_alt_pressed ? 'C' : undefined}
      />
    </div>
  )

  const tasks_section = (
    <>
      <UiTabs
        tabs={[{ id: 'tasks', label: t('home.tasks') }]}
        active_tab="tasks"
        on_tab_change={() => {}}
        actions={
          <>
            {roots.length > 1 && (
              <div className={styles['inner__workspace-dropdown']}>
                <div
                  className={styles['inner__workspace-dropdown__button']}
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
                    className={
                      styles['inner__workspace-dropdown__button__text']
                    }
                  >
                    {active_root?.split(/[\\/]/).pop() || active_root}
                  </span>
                  <span
                    className={cn(
                      'codicon codicon-unfold',
                      styles['inner__workspace-dropdown__button__icon']
                    )}
                  />
                </div>
              </div>
            )}
          </>
        }
      />

      <UiSpacer height={4} />

      <div className={styles.inner__tasks}>
        <UiTasks
          tasks={tasks[active_root] || []}
          on_reorder={(new_tasks) => handle_reorder(active_root, new_tasks)}
          on_change={(updated_task) => {
            handle_change(active_root, tasks[active_root] || [], updated_task)
          }}
          on_add={() => {
            handle_add(active_root, tasks[active_root] || [])
          }}
          on_add_subtask={(parent_task) => {
            handle_add_subtask(
              active_root,
              tasks[active_root] || [],
              parent_task
            )
          }}
          on_delete={(timestamp) => {
            handle_delete(active_root, timestamp)
          }}
          translations={{
            placeholder: t('home.tasks.placeholder'),
            add_new: t('home.tasks.add-new')
          }}
        />
      </div>
    </>
  )

  const footer = (
    <div className={styles['bottom-wrapper']}>
      <div className={styles.bottom}>
        <div className={styles.bottom__links}>
          <div className={styles.bottom__version}>{props.version}</div>
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
  )

  if (is_landscape) {
    return (
      <div className={styles.landscape}>
        <div
          className={`${styles.landscape__column} ${styles['landscape__column--header']}`}
        >
          {header}
        </div>
        <div
          className={`${styles.landscape__column} ${styles['landscape__column--targets']}`}
        >
          <UiScrollable on_scroll={handle_scroll} top_shadow>
            <div className={styles.content}>
              <div className={styles.inner}>
                <UiSpacer height={6} />
                {targets_section}
                <UiSpacer height={6} />
              </div>
            </div>
          </UiScrollable>
        </div>
        <div
          className={`${styles.landscape__column} ${styles['landscape__column--tasks']}`}
        >
          <UiScrollable top_shadow>
            <div className={styles.content}>
              <div className={styles.inner}>
                <UiSpacer height={6} />
                {tasks_section}
              </div>
              {footer}
            </div>
          </UiScrollable>
        </div>
      </div>
    )
  }

  return (
    <>
      {header}
      <UiScrollable on_scroll={handle_scroll} top_shadow>
        <div className={styles.content}>
          <div className={styles.inner}>
            <UiSpacer height={2} />
            {targets_section}
            <UiSpacer height={10} />
            {tasks_section}
          </div>
          {footer}
        </div>
      </UiScrollable>
    </>
  )
}

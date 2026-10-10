import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import styles from './PromptField.module.scss'
import cn from 'classnames'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { use_ghost_text } from './hooks/use-ghost-text'
import { use_drag_drop } from './hooks/use-drag-drop'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'
import { use_is_mac } from '@shared/hooks'
import { Target } from '@shared/types/target'
import { display_token_count } from '@shared/utils/display-token-count'
import {
  get_caret_position_from_div,
  set_caret_position_for_div,
  map_raw_pos_to_display_pos,
  get_highlighted_text
} from '../shared/symbols'
import { Tabs, TabsRef } from './components/Tabs'
import { Footer } from './components/Footer'
import { CompletedTasks } from './components/CompletedTasks'
import { Checkbox } from '../../Checkbox/Checkbox'
import { KeycapWrapper } from '../../../prompt-view/KeycapWrapper'
import { Tooltip } from '../../Tooltip'

export type EditFormat = 'whole' | 'search-replace' | 'diff' | 'truncated'

export type SelectionState = {
  text: string
  start_line: number
  start_col: number
  end_line: number
  end_col: number
}

export namespace PromptField {
  export type Props = {
    value: string
    chat_history: string[]
    on_change: (value: string) => void
    on_submit: () => void
    on_submit_with_control: () => void
    on_copy: () => void
    is_connected: boolean
    current_selection?: SelectionState | null
    on_caret_position_change: (caret_position: number) => void
    is_web_target: boolean
    on_at_sign_click: () => void
    on_hash_sign_click: () => void
    on_slash_click: () => void
    send_with_shift_enter?: boolean
    caret_position_to_set?: number
    on_caret_position_set?: () => void
    focus_key?: number
    focus_and_select_key?: number
    last_choice_tooltip?: { name: string; details?: string }
    show_edit_format_selector?: boolean
    edit_format?: EditFormat
    on_edit_format_change?: (format?: EditFormat) => void
    selected_files?: string[]
    currently_open_file_path?: string
    currently_open_file_text?: string
    on_go_to_file: (file_path: string) => void
    on_pasted_lines_click: (path: string, start?: string, end?: string) => void
    on_open_website: (url: string) => void
    on_paste_image: (base64_content: string) => void
    on_open_image: (hash: string) => void
    on_paste_long_text: (text: string) => void
    on_open_pasted_text: (hash: string) => void
    on_paste_url: (url: string) => void
    on_changes_click?: (branch_name: string) => void
    on_commit_click?: (
      repo_name: string,
      commit_hash: string,
      type: 'Commit' | 'CommitMessage',
      commit_message?: string
    ) => void
    on_skill_click?: (agent: string, repo: string, skill_name: string) => void
    on_preview_prompt?: () => void
    is_recording: boolean
    on_recording_started: () => void
    on_recording_finished: () => void
    tabs_count: number
    active_tab_index: number
    on_tab_change: (index: number) => void
    on_new_tab: () => void
    on_tab_delete: (index: number) => void
    on_tabs_reorder?: (new_order: number[]) => void
    voice_input_push_to_talk?: boolean
    prompt_token_count: number
    is_copy_only?: boolean
    target: Target
    on_target_change: (target: Target) => void
    active_border_color?: 'blue' | 'purple' | 'yellow'
    are_keyboard_shortcuts_disabled?: boolean
    completed_tasks: string[]
    on_task_completed?: () => void
    on_clear_completed_tasks?: () => void
    translations: {
      voice_input: string
      stop_recording: string
      reference_file: string
      insert_symbol: string
      use_template: string
      edit_format: string
      edit_format_whole: string
      edit_format_search_replace: string
      edit_format_diff: string
      edit_format_truncated: string
      placeholder_code_history: string
      placeholder_code: string
      placeholder_history: string
      placeholder_default: string
      send_with: string
      send_with_ellipsis: string
      copy_prompt: string
      preview_prompt: string
      send: string
      attach_selected_files: string
      completed_tasks: string
      completed_task: string
      clear_session: string
      mark_as_complete: string
      new_tab: string
      clear_tab: string
      close_tab: string
    }
  }
}

export const PromptField: React.FC<PromptField.Props> = (props) => {
  const input_ref = useRef<HTMLDivElement>(null)
  const [caret_position, set_caret_position] = useState(0)
  const prev_tab_index_ref = useRef(props.active_tab_index)
  const [should_show_ghost_text, set_should_show_ghost_text] = useState(false)
  const [is_text_selecting, set_is_text_selecting] = useState(false)
  const [is_focused, set_is_focused] = useState(false)
  const [is_checkbox_hovered, set_is_checkbox_hovered] = useState(false)
  const [is_completed_tasks_expanded, set_is_completed_tasks_expanded] =
    useState(false)

  const container_inner_ref = useRef<HTMLDivElement>(null)
  const tabs_ref = useRef<TabsRef>(null)

  const has_content =
    !!props.value ||
    !!(props.selected_files && props.selected_files.length > 0) ||
    props.completed_tasks.length > 0

  const { is_alt_pressed, handle_container_key_down } =
    use_keyboard_shortcuts(props)

  const {
    is_dropdown_open,
    toggle_dropdown,
    close_dropdown,
    dropdown_ref,
    handle_copy_click,
    handle_select_click
  } = use_dropdown(props)

  const { ghost_text, handle_accept_ghost_text } = use_ghost_text({
    value: props.value,
    input_ref,
    is_focused: is_focused && should_show_ghost_text,
    currently_open_file_text: props.currently_open_file_text,
    selected_files: props.selected_files,
    caret_position
  })

  const {
    handle_input_change,
    handle_submit,
    handle_key_down,
    handle_copy,
    handle_cut,
    handle_paste,
    handle_input_click
  } = use_handlers(props, {
    input_ref,
    ghost_text,
    on_accept_ghost_text: handle_accept_ghost_text,
    set_caret_position
  })

  const { handle_drag_start, handle_drag_over, handle_drop, handle_drag_end } =
    use_drag_drop(props, input_ref)

  const mouse_down_pos_ref = useRef<{ x: number; y: number } | null>(null)

  const handle_mouse_down = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      set_should_show_ghost_text(false)
      mouse_down_pos_ref.current = { x: e.clientX, y: e.clientY }

      const handle_mouse_move = (move_e: MouseEvent) => {
        if (mouse_down_pos_ref.current) {
          const dx = Math.abs(move_e.clientX - mouse_down_pos_ref.current.x)
          const dy = Math.abs(move_e.clientY - mouse_down_pos_ref.current.y)
          if (dx >= 1 || dy >= 1) {
            set_is_text_selecting(true)
          }
        }
      }

      const handle_mouse_up = () => {
        set_is_text_selecting(false)
        mouse_down_pos_ref.current = null
        document.removeEventListener('mousemove', handle_mouse_move)
        document.removeEventListener('mouseup', handle_mouse_up)
      }

      document.addEventListener('mousemove', handle_mouse_move)
      document.addEventListener('mouseup', handle_mouse_up)
    },
    []
  )

  const is_mac = use_is_mac()

  const highlighted_html = useMemo(() => {
    return get_highlighted_text({
      text: props.value,
      current_selection: props.current_selection,
      context_file_paths: props.selected_files ?? [],
      is_web_target: props.is_web_target,
      tabs_config: {
        count: props.tabs_count,
        active_index: props.active_tab_index
      }
    })
  }, [
    props.value,
    props.current_selection,
    props.selected_files,
    props.is_web_target,
    props.tabs_count,
    props.active_tab_index
  ])

  useEffect(() => {
    if (input_ref.current && input_ref.current.innerHTML !== highlighted_html) {
      const is_focused = document.activeElement === input_ref.current
      const tab_changed = prev_tab_index_ref.current !== props.active_tab_index

      let selection_start = 0
      if (!tab_changed) {
        selection_start = get_caret_position_from_div(input_ref.current)
      }

      input_ref.current.innerHTML = highlighted_html

      if (tab_changed) {
        prev_tab_index_ref.current = props.active_tab_index
        const display_pos = map_raw_pos_to_display_pos({
          raw_pos: props.value.length,
          raw_text: props.value,
          context_file_paths: props.selected_files ?? []
        })
        input_ref.current.focus()
        set_caret_position_for_div(input_ref.current, display_pos)
      } else if (is_focused) {
        set_caret_position_for_div(input_ref.current, selection_start)
      }
    }
  }, [
    highlighted_html,
    props.active_tab_index,
    props.value,
    props.selected_files
  ])

  const placeholder = useMemo(() => {
    return props.chat_history.length > 0
      ? props.translations.placeholder_history
      : props.translations.placeholder_default
  }, [props.chat_history])

  useEffect(() => {
    if (props.is_recording) {
      const handle_click = () => {
        props.on_recording_finished()
      }

      document.addEventListener('click', handle_click, true)
      return () => {
        document.removeEventListener('click', handle_click, true)
      }
    }
  }, [props.is_recording])

  return (
    <div className={styles.container}>
      <div
        ref={container_inner_ref}
        className={cn(styles.container__inner, {
          [styles['container__inner--selecting']]: is_text_selecting,
          [styles['container__inner--active-border-blue']]:
            props.active_border_color === 'blue',
          [styles['container__inner--active-border-purple']]:
            props.active_border_color === 'purple',
          [styles['container__inner--active-border-yellow']]:
            props.active_border_color === 'yellow'
        })}
        onKeyDown={handle_container_key_down}
        onClick={() => input_ref.current?.focus()}
      >
        <div className={styles['input-wrapper']}>
          <div className={styles['input-row']}>
            <div className={styles['input-content']}>
              {!props.value && (
                <div className={styles['placeholder-mirror']}>
                  <div
                    className={styles['top-right']}
                    style={{ visibility: 'hidden' }}
                  >
                    {has_content && props.prompt_token_count > 250 && (
                      <div className={styles['top-right__prompt-token-count']}>
                        {display_token_count(props.prompt_token_count)}
                      </div>
                    )}
                    <Tabs
                      tabs_count={props.tabs_count}
                      active_tab_index={props.active_tab_index}
                    />
                  </div>
                  {props.on_task_completed && (
                    <div
                      className={styles['checkbox-wrapper']}
                      style={{ visibility: 'hidden' }}
                    >
                      {is_alt_pressed ? (
                        <KeycapWrapper char="C">
                          <Checkbox checked={false} on_change={() => {}} />
                        </KeycapWrapper>
                      ) : (
                        <Checkbox checked={false} on_change={() => {}} />
                      )}
                    </div>
                  )}
                  <div className={styles['placeholder-text']}>
                    {placeholder}
                  </div>
                </div>
              )}
              <div
                className={styles['top-right']}
                onMouseLeave={() => {
                  tabs_ref.current?.handle_mouse_leave()
                }}
              >
                {has_content && props.prompt_token_count > 250 && (
                  <div className={styles['top-right__prompt-token-count']}>
                    {display_token_count(props.prompt_token_count)}
                  </div>
                )}
                <Tabs
                  ref={tabs_ref}
                  tabs_count={props.tabs_count}
                  active_tab_index={props.active_tab_index}
                  on_tabs_reorder={props.on_tabs_reorder}
                  handle_input_click={handle_input_click}
                  has_text={!!props.value}
                  translations={{
                    new_tab: props.translations.new_tab,
                    clear_tab: props.translations.clear_tab,
                    close_tab: props.translations.close_tab
                  }}
                />
              </div>
              {props.on_task_completed && (
                <div
                  className={styles['checkbox-wrapper']}
                  onMouseEnter={() => set_is_checkbox_hovered(true)}
                  onMouseLeave={() => set_is_checkbox_hovered(false)}
                >
                  {is_checkbox_hovered && (
                    <Tooltip
                      message={props.translations.mark_as_complete}
                      position="right"
                      align="center"
                    />
                  )}
                  {is_alt_pressed ? (
                    <KeycapWrapper char="C">
                      <Checkbox
                        checked={false}
                        on_change={() => {
                          props.on_task_completed!()
                        }}
                      />
                    </KeycapWrapper>
                  ) : (
                    <Checkbox
                      checked={false}
                      on_change={() => {
                        props.on_task_completed!()
                      }}
                    />
                  )}
                </div>
              )}
              <div
                ref={input_ref}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={(e) => {
                  set_should_show_ghost_text(true)
                  handle_input_change(e)
                  set_is_completed_tasks_expanded(false)
                }}
                onKeyDown={(e) => {
                  if (
                    e.key == 'ArrowRight' ||
                    e.key == 'ArrowLeft' ||
                    e.key == 'ArrowUp' ||
                    e.key == 'ArrowDown'
                  ) {
                    set_should_show_ghost_text(false)
                    const ghost_text_node = input_ref.current?.querySelector(
                      'span[data-type="ghost-text"]'
                    )
                    if (
                      ghost_text_node &&
                      !e.ctrlKey &&
                      !e.altKey &&
                      !e.metaKey
                    ) {
                      ghost_text_node.remove()
                      e.preventDefault()
                      const selection = window.getSelection()
                      if (selection) {
                        const type = e.shiftKey ? 'extend' : 'move'
                        selection.modify(type, 'forward', 'character')
                      }
                    }
                  } else {
                    set_should_show_ghost_text(true)
                  }
                  handle_key_down(e)
                }}
                onCopy={handle_copy}
                onCut={handle_cut}
                onPaste={handle_paste}
                onClick={handle_input_click}
                onMouseDown={handle_mouse_down}
                onDragStart={handle_drag_start}
                onDrop={handle_drop}
                onDragOver={handle_drag_over}
                onDragEnd={handle_drag_end}
                onFocus={() => set_is_focused(true)}
                onBlur={() => set_is_focused(false)}
                className={cn(styles.input, {
                  [styles['input--empty']]: !props.value
                })}
              />
            </div>
          </div>
          <CompletedTasks
            tasks={props.completed_tasks}
            selected_files={props.selected_files}
            is_web_target={props.is_web_target}
            on_clear_completed_tasks={props.on_clear_completed_tasks}
            translations={{
              completed_tasks: props.translations.completed_tasks,
              completed_task: props.translations.completed_task,
              clear_session: props.translations.clear_session
            }}
            is_expanded={is_completed_tasks_expanded}
            set_is_expanded={set_is_completed_tasks_expanded}
          />
        </div>

        <Footer
          props={props}
          input_ref={input_ref}
          is_mac={is_mac}
          is_alt_pressed={is_alt_pressed}
          is_dropdown_open={is_dropdown_open}
          toggle_dropdown={toggle_dropdown}
          close_dropdown={close_dropdown}
          dropdown_ref={dropdown_ref}
          handle_submit={handle_submit}
          handle_copy_click={handle_copy_click}
          handle_select_click={handle_select_click}
        />
      </div>
    </div>
  )
}
